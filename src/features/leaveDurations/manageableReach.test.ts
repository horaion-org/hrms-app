import { describe, expect, it } from "vitest";
import { manageableReach } from "@/features/leaveDurations/manageableReach";
import type { ScopeRef } from "@/features/workspace/scopes";
import type { UnitReachChoices } from "@/features/workspace/unitReach";

/** Orchard with Kitchen and Bar, Marina with Harbour. */
const CHOICES: UnitReachChoices = {
	branches: [
		{ branchId: "b-orchard", name: "Orchard", country: "SG", status: "ACTIVE" },
		{ branchId: "b-marina", name: "Marina", country: "SG", status: "ACTIVE" },
	],
	departments: [
		{
			departmentId: "d-kitchen",
			name: "Kitchen",
			branchId: "b-orchard",
			branchName: "Orchard",
			country: "SG",
			status: "ACTIVE",
		},
		{
			departmentId: "d-bar",
			name: "Bar",
			branchId: "b-orchard",
			branchName: "Orchard",
			country: "SG",
			status: "ACTIVE",
		},
		{
			departmentId: "d-harbour",
			name: "Harbour",
			branchId: "b-marina",
			branchName: "Marina",
			country: "SG",
			status: "ACTIVE",
		},
	],
};

/** Holds the key at the company, or at exactly the listed units. */
const holder =
	(company: boolean, unitIds: ReadonlyArray<string>) =>
	(target: ScopeRef): boolean =>
		target.kind === "company" ? company : unitIds.includes(target.id);

const ids = (choices: UnitReachChoices): Array<string> => [
	...choices.branches.map((branch) => branch.branchId),
	...choices.departments.map((department) => department.departmentId),
];

describe("manageableReach", () => {
	it("offers a company admin all three choices and every unit", () => {
		const reach = manageableReach(CHOICES, () => true);
		expect(reach.reaches).toEqual(["COMPANY", "BRANCHES", "DEPARTMENTS"]);
		expect(reach.choices).toEqual(CHOICES);
	});

	it("offers a branch admin their branch and its departments, not the whole company", () => {
		const reach = manageableReach(
			CHOICES,
			holder(false, ["b-orchard", "d-kitchen", "d-bar"])
		);
		expect(reach.reaches).toEqual(["BRANCHES", "DEPARTMENTS"]);
		expect(ids(reach.choices)).toEqual(["b-orchard", "d-kitchen", "d-bar"]);
	});

	it("offers a department admin Chosen departments with their department only", () => {
		const reach = manageableReach(CHOICES, holder(false, ["d-kitchen"]));
		expect(reach.reaches).toEqual(["DEPARTMENTS"]);
		expect(ids(reach.choices)).toEqual(["d-kitchen"]);
	});

	it("offers nothing to someone without the key", () => {
		expect(manageableReach(CHOICES, () => false).reaches).toEqual([]);
	});
});
