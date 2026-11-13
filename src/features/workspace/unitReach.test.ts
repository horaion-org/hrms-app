import { describe, expect, it } from "vitest";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	BRANCH_POLICY_FIXTURE,
	COMPANY_CONSTRAINT_FIXTURES,
	DEPARTMENTS_POLICY_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import {
	reachChoicesOf,
	reachedUnitsOf,
	reachLabel,
	reachOf,
	reachValueOf,
} from "@/features/workspace/unitReach";
import type { Workspace } from "@/features/workspace/api";

const t = authTestI18n.t;
const WHOLE_COMPANY = COMPANY_CONSTRAINT_FIXTURES[0]!;

/** Orchard (open) with Kitchen and Bar, and a closed Marina branch; the policy keys held company-wide. */
const workspace: Workspace = effectiveWorkspace({
	companies: [
		{
			uuid: "c-1",
			name: "Acme",
			permissions: ["scheduling_policy:read", "scheduling_policy:update"],
			branches: [
				{
					uuid: "b-1",
					name: "Orchard",
					status: "ACTIVE",
					country: "SG",
					permissions: [],
					departments: [
						{ uuid: "d-1", name: "Kitchen", status: "ACTIVE", permissions: [] },
						{ uuid: "d-2", name: "Bar", status: "INACTIVE", permissions: [] },
					],
				},
				{
					uuid: "b-2",
					name: "Marina",
					status: "INACTIVE",
					country: "SG",
					permissions: [],
					departments: [],
				},
			],
		},
	],
});

describe("reachOf", () => {
	it("reads each kind of reach", () => {
		expect(reachOf(WHOLE_COMPANY)).toBe("COMPANY");
		expect(reachOf(BRANCH_POLICY_FIXTURE)).toBe("BRANCHES");
		expect(reachOf(DEPARTMENTS_POLICY_FIXTURE)).toBe("DEPARTMENTS");
	});
});

describe("reachValueOf", () => {
	it("starts a new constraint at the whole company", () => {
		expect(reachValueOf()).toEqual({
			appliesTo: "COMPANY",
			branchIds: [],
			departmentIds: [],
		});
	});

	it("starts an edited constraint at its own reach", () => {
		expect(reachValueOf(DEPARTMENTS_POLICY_FIXTURE)).toEqual({
			appliesTo: "DEPARTMENTS",
			branchIds: [],
			departmentIds: ["d-2", "d-1"],
		});
	});
});

describe("reachLabel", () => {
	it("says the whole company as every department", () => {
		expect(reachLabel(WHOLE_COMPANY, t)).toBe("All departments");
	});

	it("names a branch as a branch", () => {
		expect(reachLabel(BRANCH_POLICY_FIXTURE, t)).toBe("Orchard (branch)");
	});

	it("lists chosen departments by name", () => {
		expect(reachLabel(DEPARTMENTS_POLICY_FIXTURE, t)).toBe("Bar, Kitchen");
	});
});

describe("reachedUnitsOf", () => {
	const choices = reachChoicesOf(workspace, "c-1", "scheduling_policy:update");

	it("names the chosen kind's units only", () => {
		expect(
			reachedUnitsOf(
				{
					appliesTo: "DEPARTMENTS",
					branchIds: ["b-1"],
					departmentIds: ["d-1"],
				},
				choices
			)
		).toEqual({
			appliesToBranches: [],
			appliesToDepartments: [
				{
					departmentId: "d-1",
					departmentName: "Kitchen",
					branchId: "b-1",
					branchName: "Orchard",
				},
			],
		});
	});

	it("names nothing for the whole company", () => {
		expect(
			reachedUnitsOf(
				{ appliesTo: "COMPANY", branchIds: ["b-1"], departmentIds: [] },
				choices
			)
		).toEqual({ appliesToBranches: [], appliesToDepartments: [] });
	});
});

describe("reachChoicesOf", () => {
	it("offers every branch and department of the company, inactive ones too", () => {
		const choices = reachChoicesOf(workspace, "c-1", "scheduling_policy:update");

		expect(choices.branches.map((branch) => branch.name)).toEqual([
			"Marina",
			"Orchard",
		]);
		expect(choices.departments.map((department) => department.name)).toEqual([
			"Bar",
			"Kitchen",
		]);
	});

	it("offers nothing for another company", () => {
		expect(reachChoicesOf(workspace, "c-2", "scheduling_policy:update")).toEqual({
			branches: [],
			departments: [],
		});
	});
});
