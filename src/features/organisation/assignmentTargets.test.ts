import { describe, expect, it } from "vitest";
import {
	changeableAt,
	companyRoleOutOfReach,
	keysThatFitNowhere,
	placeKey,
	roleFitsScope,
	scopeOfPlace,
} from "@/features/organisation/assignmentTargets";
import {
	branchScope,
	type CanAt,
	COMPANY_SCOPE,
	departmentScope,
} from "@/features/workspace/scopes";

const local = {
	kind: "LOCAL" as const,
	permissions: ["branch:read", "department:read"],
};
const company = {
	kind: "COMPANY" as const,
	permissions: ["department:read"],
};
const WHOLE = {};
const ORCHARD = { branchId: "b-1" };
const KITCHEN = { branchId: "b-1", departmentId: "d-1" };

describe("where a role can be given", () => {
	it("gives a company role at the whole company only, whatever its keys", () => {
		expect(roleFitsScope(company, COMPANY_SCOPE)).toBe(true);
		expect(roleFitsScope(company, branchScope("b-1"))).toBe(false);
		expect(roleFitsScope(company, departmentScope("d-1"))).toBe(false);
	});

	it("gives a local role wherever each of its keys can be given", () => {
		expect(roleFitsScope(local, COMPANY_SCOPE)).toBe(true);
		expect(roleFitsScope(local, branchScope("b-1"))).toBe(true);
		expect(roleFitsScope(local, departmentScope("d-1"))).toBe(false);
	});

	it("says when a company role's only place is out of the person's reach", () => {
		expect(companyRoleOutOfReach(company, [ORCHARD, KITCHEN])).toBe(true);
		expect(companyRoleOutOfReach(company, [])).toBe(true);
		expect(companyRoleOutOfReach(company, [WHOLE, ORCHARD])).toBe(false);
		expect(companyRoleOutOfReach(local, [KITCHEN])).toBe(false);
	});

	it("names the keys in the way only for a local role", () => {
		expect(keysThatFitNowhere(local, [KITCHEN])).toEqual(["branch:read"]);
		expect(keysThatFitNowhere(local, [ORCHARD, KITCHEN])).toEqual([]);
		expect(keysThatFitNowhere(company, [KITCHEN])).toEqual([]);
	});

	it("reads a place the API sends with null ids", () => {
		const place = { branchId: null, departmentId: "d-1" };
		expect(placeKey(place)).toBe("d-1");
		expect(scopeOfPlace(place)).toEqual(departmentScope("d-1"));
		expect(placeKey({ branchId: null, departmentId: null })).toBe("");
		expect(scopeOfPlace({ branchId: null, departmentId: null })).toEqual(
			COMPANY_SCOPE
		);
	});
});

describe("which assignments the person may change", () => {
	it("checks access_role:assign at the assignment's own place", () => {
		const can: CanAt = (_permission, target) => target.kind === "branch";
		const changeable = changeableAt(can);

		expect(changeable(ORCHARD)).toBe(true);
		expect(changeable(KITCHEN)).toBe(false);
		expect(changeable(WHOLE)).toBe(false);
	});
});
