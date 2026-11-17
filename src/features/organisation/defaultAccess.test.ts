import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type {
	AccessRole,
	DefaultAccessRule,
} from "@/features/organisation/api";
import type { PlaceRef } from "@/features/organisation/assignmentTargets";
import {
	defaultAccessAssignments,
	defaultAccessBodyOf,
	defaultRuleText,
	defaultsReaching,
	defaultSetFor,
	roleFitsDefault,
} from "@/features/organisation/defaultAccess";

const t = authTestI18n.t.bind(authTestI18n);

// The worked example of the design note: Harbour Hotel (branch) with Housekeeping and Front Desk.
const HARBOUR = "b-harbour";
const RIVERSIDE = "b-riverside";
const HOUSEKEEPING = "d-housekeeping";
const FRONT_DESK = "d-front-desk";
const KITCHEN = "d-kitchen";

const rule = (
	defaultAccessRuleId: string,
	accessRoleId: string,
	place: Pick<DefaultAccessRule, "setAt" | "branchId" | "departmentId">,
	appliesTo: DefaultAccessRule["appliesTo"] = "OWN_DEPARTMENT"
): DefaultAccessRule => ({
	defaultAccessRuleId,
	accessRoleId,
	appliesTo,
	...place,
});

const atCompany = {
	setAt: "COMPANY",
	branchId: null,
	departmentId: null,
} as const;
const atHarbour = {
	setAt: "BRANCH",
	branchId: HARBOUR,
	departmentId: null,
} as const;
const atHousekeeping = {
	setAt: "DEPARTMENT",
	branchId: null,
	departmentId: HOUSEKEEPING,
} as const;

const X = rule("x", "role-staff", atCompany);
const Y = rule("y", "role-leave", atHarbour);
const Z = rule("z", "role-availability", atHousekeeping);
const RULES = [X, Y, Z];

const role = (accessRoleId: string, name: string): AccessRole => ({
	accessRoleId,
	name,
	protectedRole: false,
	kind: "LOCAL",
	status: "ACTIVE",
	permissions: ["schedule:read"],
	holderCount: 0,
});
const ROLES = [
	role("role-staff", "Staff"),
	role("role-leave", "Leave calendar"),
	role("role-availability", "Availability viewer"),
];

const NAMES: Record<string, string> = {
	[HARBOUR]: "Harbour Hotel",
	[HOUSEKEEPING]: "Harbour Hotel › Housekeeping",
};
const placeLabel = (place: PlaceRef): string | undefined =>
	NAMES[place.departmentId ?? place.branchId ?? ""];

describe("defaultsReaching", () => {
	it("gives someone in Housekeeping the company, branch and department defaults", () => {
		expect(
			defaultsReaching(RULES, { branchId: HARBOUR, departmentId: HOUSEKEEPING })
		).toEqual([X, Y, Z]);
	});

	it("gives someone in Front Desk the company and branch defaults only", () => {
		expect(
			defaultsReaching(RULES, { branchId: HARBOUR, departmentId: FRONT_DESK })
		).toEqual([X, Y]);
	});

	it("gives someone in another branch the company default only", () => {
		expect(
			defaultsReaching(RULES, { branchId: RIVERSIDE, departmentId: KITCHEN })
		).toEqual([X]);
	});

	it("gives someone without a department nothing", () => {
		expect(
			defaultsReaching(RULES, { branchId: null, departmentId: null })
		).toEqual([]);
	});
});

describe("defaultSetFor", () => {
	it("names whose people each default covers", () => {
		expect(defaultSetFor(X, placeLabel, t)).toBe("Everyone in the company");
		expect(defaultSetFor(Y, placeLabel, t)).toBe("Everyone in Harbour Hotel");
	});

	it("names a place the reader can't see as such", () => {
		const hidden = rule("h", "role-staff", {
			setAt: "BRANCH",
			branchId: RIVERSIDE,
			departmentId: null,
		});
		expect(defaultSetFor(hidden, placeLabel, t)).toBe(
			"Everyone in a place you can't see"
		);
	});
});

describe("defaultRuleText", () => {
	it("words a default for the list", () => {
		expect(
			defaultRuleText(
				rule("b", "role-leave", atHarbour, "OWN_BRANCH"),
				ROLES,
				placeLabel,
				t
			)
		).toEqual({
			role: "Leave calendar",
			setFor: "Everyone in Harbour Hotel",
			appliesTo: "Their own branch",
		});
	});

	it("words a role missing from the list as unknown", () => {
		expect(defaultRuleText(X, [], placeLabel, t).role).toBe(
			"A role you can't see"
		);
	});
});

describe("defaultAccessAssignments", () => {
	it("places each default at the person's own department or branch, named for where it was set", () => {
		const own = defaultAccessAssignments(
			[X, rule("y", "role-leave", atHarbour, "OWN_BRANCH")],
			{ branchId: HARBOUR, departmentId: HOUSEKEEPING },
			ROLES,
			placeLabel,
			t
		);

		expect(own.assignments).toEqual([
			{
				accessRoleAssignmentId: "default:x",
				accessRoleId: "default:x",
				status: "ACTIVE",
				branchId: null,
				departmentId: HOUSEKEEPING,
			},
			{
				accessRoleAssignmentId: "default:y",
				accessRoleId: "default:y",
				status: "ACTIVE",
				branchId: HARBOUR,
				departmentId: null,
			},
		]);
		expect(own.roles.map((item) => item.name)).toEqual([
			"Staff (company default)",
			"Leave calendar (set for Harbour Hotel)",
		]);
		expect(own.roles[0]?.permissions).toEqual(["schedule:read"]);
	});

	it("leaves out a default whose role the reader's list lacks", () => {
		expect(
			defaultAccessAssignments(
				[X],
				{ branchId: HARBOUR, departmentId: HOUSEKEEPING },
				[],
				placeLabel,
				t
			)
		).toEqual({ assignments: [], roles: [] });
	});
});

describe("roleFitsDefault", () => {
	it("takes an active local custom role whose keys work at the reach", () => {
		expect(roleFitsDefault(role("r", "Staff"), "OWN_DEPARTMENT")).toBe(true);
	});

	it("refuses a company role, a built-in role and a switched-off role", () => {
		expect(
			roleFitsDefault(
				{ ...role("r", "Auditor"), kind: "COMPANY" },
				"OWN_BRANCH"
			)
		).toBe(false);
		expect(
			roleFitsDefault(
				{ ...role("r", "Admin"), protectedRole: true },
				"OWN_BRANCH"
			)
		).toBe(false);
		expect(
			roleFitsDefault({ ...role("r", "Old"), status: "INACTIVE" }, "OWN_BRANCH")
		).toBe(false);
	});

	it("refuses a branch-only key for their own department but takes it for their own branch", () => {
		const branchReader = {
			...role("r", "Branch reader"),
			permissions: ["branch:read"],
		};
		expect(roleFitsDefault(branchReader, "OWN_DEPARTMENT")).toBe(false);
		expect(roleFitsDefault(branchReader, "OWN_BRANCH")).toBe(true);
	});
});

describe("defaultAccessBodyOf", () => {
	it("names no unit for the company, the branch for a branch, and only the department for a department", () => {
		expect(
			defaultAccessBodyOf("r", "OWN_DEPARTMENT", { label: "Whole company" })
		).toEqual({
			accessRoleId: "r",
			appliesTo: "OWN_DEPARTMENT",
		});
		expect(
			defaultAccessBodyOf("r", "OWN_BRANCH", {
				label: "Harbour",
				branchId: HARBOUR,
			})
		).toEqual({
			accessRoleId: "r",
			appliesTo: "OWN_BRANCH",
			branchId: HARBOUR,
		});
		expect(
			defaultAccessBodyOf("r", "OWN_DEPARTMENT", {
				label: "Housekeeping",
				branchId: HARBOUR,
				departmentId: HOUSEKEEPING,
			})
		).toEqual({
			accessRoleId: "r",
			appliesTo: "OWN_DEPARTMENT",
			departmentId: HOUSEKEEPING,
		});
	});
});
