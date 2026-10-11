import { describe, expect, it } from "vitest";
import type { Workspace } from "@/features/workspace/api";
import {
	accessIndexOf,
	branchScope,
	buildAccessIndex,
	canAll,
	canAny,
	canAnywhere,
	canAt,
	COMPANY_SCOPE,
	departmentScope,
	effectiveAt,
	recordScope,
} from "@/features/workspace/scopes";

/**
 * As the API sends it: every node's permissions are already effective, so
 * Orchard repeats the company's key and Kitchen repeats Orchard's.
 */
const workspace: Workspace = {
	companies: [
		{
			uuid: "c-1",
			name: "Acme",
			permissions: ["company:read"],
			branches: [
				{
					uuid: "b-1",
					name: "Orchard",
					status: "ACTIVE",
					country: "SG",
					permissions: ["company:read", "branch:update"],
					departments: [
						{
							uuid: "d-1",
							name: "Kitchen",
							status: "ACTIVE",
							permissions: [
								"company:read",
								"branch:update",
								"department:read",
								"member_profile:read",
							],
						},
					],
				},
				{
					uuid: "b-2",
					name: "Bugis",
					status: "ACTIVE",
					country: "SG",
					// Listed only as context for navigation: nothing is effective here.
					permissions: [],
					departments: [],
				},
			],
		},
	],
};

const index = buildAccessIndex(workspace, "c-1");

describe("canAt", () => {
	it("answers from the node's own effective set, merging nothing", () => {
		expect(canAt(index, "company:read", COMPANY_SCOPE)).toBe(true);
		expect(canAt(index, "branch:update", branchScope("b-1"))).toBe(true);
		expect(canAt(index, "department:read", departmentScope("d-1"))).toBe(true);
		// A key held lower down is not authority above it.
		expect(canAt(index, "department:read", branchScope("b-1"))).toBe(false);
		expect(canAt(index, "branch:update", COMPANY_SCOPE)).toBe(false);
	});

	it("answers false for a unit the workspace does not list, never falling back to the company (F04)", () => {
		expect(canAt(index, "company:read", branchScope("b-9"))).toBe(false);
		expect(canAt(index, "company:read", departmentScope("d-9"))).toBe(false);
		// The same id asked as the wrong kind of unit is unknown too.
		expect(canAt(index, "department:read", branchScope("d-1"))).toBe(false);
	});

	it("does not treat a parent shown as context as holding anything", () => {
		expect(canAt(index, "company:read", branchScope("b-2"))).toBe(false);
	});

	it("answers false everywhere for a company the workspace does not list", () => {
		const other = buildAccessIndex(workspace, "c-9");
		expect(canAt(other, "company:read", COMPANY_SCOPE)).toBe(false);
		expect(canAnywhere(other, "company:read")).toBe(false);
	});
});

describe("canAnywhere", () => {
	it("finds a key effective at any node", () => {
		expect(canAnywhere(index, "member_profile:read")).toBe(true);
		expect(canAnywhere(index, "access_role:read")).toBe(false);
	});
});

describe("canAny and canAll (F05)", () => {
	const kitchen = departmentScope("d-1");

	it("canAny is satisfied by one alternative", () => {
		expect(
			canAny(index, ["member_profile:update", "member_profile:read"], kitchen)
		).toBe(true);
	});

	it("canAll needs every key, so read without update is not enough", () => {
		expect(
			canAll(index, ["member_profile:read", "member_profile:update"], kitchen)
		).toBe(false);
		expect(
			canAll(index, ["member_profile:read", "department:read"], kitchen)
		).toBe(true);
	});

	it("canAll of nothing is false rather than vacuously true", () => {
		expect(canAll(index, [], kitchen)).toBe(false);
	});

	it("both accept anywhere", () => {
		expect(
			canAny(index, ["access_role:read", "branch:update"], "anywhere")
		).toBe(true);
		expect(
			canAll(index, ["branch:update", "member_profile:read"], "anywhere")
		).toBe(true);
	});
});

describe("accessIndexOf", () => {
	it("builds one index per workspace answer and company", () => {
		expect(accessIndexOf(workspace, "c-1")).toBe(
			accessIndexOf(workspace, "c-1")
		);
		expect(accessIndexOf({ ...workspace }, "c-1")).not.toBe(
			accessIndexOf(workspace, "c-1")
		);
	});

	it("answers no to everything without a workspace", () => {
		expect(canAnywhere(accessIndexOf(undefined, "c-1"), "company:read")).toBe(
			false
		);
	});
});

describe("recordScope and effectiveAt", () => {
	it("files a record at its Department, or at the company without one", () => {
		expect(recordScope("d-1")).toEqual(departmentScope("d-1"));
		expect(recordScope(null)).toEqual(COMPANY_SCOPE);
		expect(recordScope(undefined)).toEqual(COMPANY_SCOPE);
	});

	it("lists exactly one node's keys", () => {
		expect([...effectiveAt(index, COMPANY_SCOPE)]).toEqual(["company:read"]);
		expect(effectiveAt(index, branchScope("b-9")).size).toBe(0);
	});
});
