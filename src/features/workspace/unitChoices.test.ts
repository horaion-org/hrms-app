import { describe, expect, it } from "vitest";
import type { Workspace } from "@/features/workspace/api";
import {
	branchChoices,
	chosenBranch,
	departmentChoices,
} from "@/features/workspace/unitChoices";

const KEYS = ["leave_request:read"] as const;

/** Orchard and Jurong in Singapore, Kuala Lumpur in Malaysia, Bugis holding another key. */
const workspace = (companyPermissions: Array<string> = []): Workspace => ({
	companies: [
		{
			uuid: "c-1",
			name: "Acme",
			permissions: companyPermissions,
			branches: [
				{
					uuid: "b-1",
					name: "Orchard",
					status: "ACTIVE",
					country: "SG",
					permissions: ["leave_request:read"],
					departments: [],
				},
				{
					uuid: "b-2",
					name: "Jurong",
					status: "ACTIVE",
					country: "SG",
					permissions: [],
					departments: [
						{ uuid: "d-1", name: "Kitchen", status: "ACTIVE", permissions: [] },
						{
							uuid: "d-2",
							name: "Sales",
							status: "ACTIVE",
							permissions: ["leave_request:read"],
						},
					],
				},
				{
					uuid: "b-3",
					name: "Kuala Lumpur",
					status: "ACTIVE",
					country: "MY",
					permissions: [],
					departments: [],
				},
				{
					uuid: "b-4",
					name: "Bugis",
					status: "ACTIVE",
					country: "SG",
					permissions: ["branch:read"],
					departments: [],
				},
			],
		},
	],
});

describe("branchChoices", () => {
	it("offers the Branches holding a key at the Branch or a Department beneath it", () => {
		expect(branchChoices(workspace(), "c-1", KEYS)).toEqual([
			{ branchId: "b-2", name: "Jurong", country: "SG", status: "ACTIVE" },
			{ branchId: "b-1", name: "Orchard", country: "SG", status: "ACTIVE" },
		]);
	});

	it("offers every Branch for a key held company-wide, by country then name", () => {
		expect(
			branchChoices(workspace(["leave_request:read"]), "c-1", KEYS).map(
				(choice) => choice.branchId
			)
		).toEqual(["b-3", "b-4", "b-2", "b-1"]);
	});

	it("matches any of the keys", () => {
		expect(
			branchChoices(workspace(), "c-1", ["branch:read", "leave_request:read"])
				.length
		).toBe(3);
	});

	it("offers only ACTIVE Branches with activeOnly, and every Branch without it", () => {
		const data = workspace(["leave_request:read"]);
		const company = data.companies[0]!;
		const inactive: Workspace = {
			companies: [
				{
					...company,
					branches: company.branches.map((branch) =>
						branch.uuid === "b-2" ? { ...branch, status: "INACTIVE" } : branch
					),
				},
			],
		};

		expect(
			branchChoices(inactive, "c-1", KEYS, { activeOnly: true }).map(
				(choice) => choice.branchId
			)
		).toEqual(["b-3", "b-4", "b-1"]);
		expect(
			branchChoices(inactive, "c-1", KEYS).find(
				(choice) => choice.branchId === "b-2"
			)?.status
		).toBe("INACTIVE");
	});

	it("offers nothing for no keys held or a company not in the workspace", () => {
		expect(branchChoices(workspace(), "c-1", ["audit_event:read"])).toEqual([]);
		expect(branchChoices(workspace(), "c-9", KEYS)).toEqual([]);
	});
});

describe("chosenBranch", () => {
	const choices = branchChoices(workspace(), "c-1", KEYS);

	it("keeps an offered Branch and falls back to the first", () => {
		expect(chosenBranch(choices, "b-1")?.branchId).toBe("b-1");
		expect(chosenBranch(choices, "b-3")?.branchId).toBe("b-2");
		expect(chosenBranch(choices, undefined)?.branchId).toBe("b-2");
	});

	it("chooses none, for every Branch, with allowAll unless an offered one is named", () => {
		expect(chosenBranch(choices, undefined, true)).toBeUndefined();
		expect(chosenBranch(choices, "b-3", true)).toBeUndefined();
		expect(chosenBranch(choices, "b-1", true)?.branchId).toBe("b-1");
	});

	it("chooses nothing when nothing is offered", () => {
		expect(chosenBranch([], "b-1")).toBeUndefined();
	});
});

describe("departmentChoices", () => {
	type Branch = Workspace["companies"][number]["branches"][number];

	/** A Branch and its Departments, the key held at the units `held` names. */
	const branchOf = (
		held: ReadonlyArray<string>,
		[uuid, name, country]: [string, string, string],
		units: Array<[string, string]>
	): Branch => ({
		uuid,
		name,
		status: "ACTIVE",
		country,
		permissions: held.includes(uuid) ? [...KEYS] : [],
		departments: units.map(([departmentId, departmentName]) => ({
			uuid: departmentId,
			name: departmentName,
			status: "ACTIVE",
			permissions: held.includes(departmentId) ? [...KEYS] : [],
		})),
	});

	/** Bar at Orchard, Sales and Kitchen at Jurong, Cafe at Kuala Lumpur. */
	const departments = (
		held: ReadonlyArray<string>,
		companyPermissions: Array<string> = []
	): Workspace => ({
		companies: [
			{
				uuid: "c-1",
				name: "Acme",
				permissions: companyPermissions,
				branches: [
					branchOf(held, ["b-1", "Orchard", "SG"], [["d-3", "Bar"]]),
					branchOf(
						held,
						["b-2", "Jurong", "SG"],
						[
							["d-2", "Sales"],
							["d-1", "Kitchen"],
						]
					),
					branchOf(held, ["b-3", "Kuala Lumpur", "MY"], [["d-4", "Cafe"]]),
				],
			},
		],
	});

	const ids = (
		data: Workspace,
		keys: ReadonlyArray<"leave_request:read" | "branch:read"> = KEYS
	): Array<string> =>
		departmentChoices(data, "c-1", keys).map((choice) => choice.departmentId);

	it("offers a Department holding a key itself, and not its siblings", () => {
		expect(ids(departments(["d-2"]))).toEqual(["d-2"]);
	});

	it("offers every Department of a Branch holding a key, by name", () => {
		expect(ids(departments(["b-2"]))).toEqual(["d-1", "d-2"]);
	});

	it("offers every Department for a key held company-wide, by country, Branch, then name", () => {
		expect(ids(departments([], ["leave_request:read"]))).toEqual([
			"d-4",
			"d-1",
			"d-2",
			"d-3",
		]);
	});

	it("names each Department with its Branch and the Branch's country", () => {
		expect(departmentChoices(departments(["d-4"]), "c-1", KEYS)).toEqual([
			{
				departmentId: "d-4",
				name: "Cafe",
				branchId: "b-3",
				branchName: "Kuala Lumpur",
				country: "MY",
				status: "ACTIVE",
			},
		]);
	});

	it("matches any of the keys", () => {
		expect(
			ids(departments(["d-2"]), ["branch:read", "leave_request:read"])
		).toEqual(["d-2"]);
	});

	it("offers with activeOnly only ACTIVE Departments under ACTIVE Branches", () => {
		const data = departments([], ["leave_request:read"]);
		const company = data.companies[0]!;
		// Sales is INACTIVE at Jurong; Cafe is ACTIVE under the INACTIVE Kuala Lumpur.
		const inactive: Workspace = {
			companies: [
				{
					...company,
					branches: company.branches.map((branch) =>
						branch.uuid === "b-3"
							? { ...branch, status: "INACTIVE" }
							: {
									...branch,
									departments: branch.departments.map((department) =>
										department.uuid === "d-2"
											? { ...department, status: "INACTIVE" }
											: department
									),
								}
					),
				},
			],
		};

		expect(
			departmentChoices(inactive, "c-1", KEYS, { activeOnly: true }).map(
				(choice) => choice.departmentId
			)
		).toEqual(["d-1", "d-3"]);
		expect(ids(inactive)).toEqual(["d-4", "d-1", "d-2", "d-3"]);
	});

	it("offers nothing for no keys held, a Branch without Departments, or a company not in the workspace", () => {
		expect(ids(departments(["d-2"]), ["branch:read"])).toEqual([]);
		expect(ids(departments(["b-9"]))).toEqual([]);
		expect(
			departmentChoices(
				{
					companies: [
						{
							uuid: "c-1",
							name: "Acme",
							permissions: ["leave_request:read"],
							branches: [branchOf([], ["b-1", "Orchard", "SG"], [])],
						},
					],
				},
				"c-1",
				KEYS
			)
		).toEqual([]);
		expect(departmentChoices(departments(["b-2"]), "c-9", KEYS)).toEqual([]);
	});
});
