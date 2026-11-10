import { describe, expect, it } from "vitest";
import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	accessSummary,
	assignmentsAfter,
	describeAccess,
	placeLabels,
} from "@/features/accessRoles/accessSummary";
import type {
	AccessRole,
	MemberAccessRoleAssignment,
} from "@/features/organisation/api";

const t = authTestI18n.t.bind(authTestI18n);

const role = (
	accessRoleId: string,
	permissions: Array<string>,
	overrides: Partial<AccessRole> = {}
): AccessRole => ({
	accessRoleId,
	name: accessRoleId,
	protectedRole: false,
	kind: "LOCAL",
	status: "ACTIVE",
	permissions,
	holderCount: 1,
	...overrides,
});
const held = (
	accessRoleAssignmentId: string,
	accessRoleId: string,
	place: { branchId?: string; departmentId?: string } = {},
	status: "ACTIVE" | "INACTIVE" = "ACTIVE"
): MemberAccessRoleAssignment => ({
	accessRoleAssignmentId,
	accessRoleId,
	status,
	branchId: place.branchId ?? null,
	departmentId: place.departmentId ?? null,
});

const ROLES = [
	role("viewer", ["department:read", "member_profile:read"]),
	role("approver", ["leave_request:read", "leave_request:review"]),
	role("creator", ["branch:read", "branch:create"], { kind: "COMPANY" }),
	role("off", ["job_title:read"], { status: "INACTIVE" }),
	role("newer", ["leave:approve", "member_note:read"]),
];

describe("a person's access summary", () => {
	it("lists the whole company first, then branches, then departments, each with what is given there", () => {
		expect(
			accessSummary(
				[
					held("a-1", "viewer", { branchId: "b-1", departmentId: "d-1" }),
					held("a-2", "approver", { branchId: "b-2" }),
					held("a-3", "viewer"),
					held("a-4", "approver", { branchId: "b-1", departmentId: "d-1" }),
				],
				ROLES
			)
		).toEqual([
			{
				branchId: null,
				departmentId: null,
				permissions: ["department:read", "member_profile:read"],
			},
			{
				branchId: "b-2",
				departmentId: null,
				permissions: ["leave_request:read", "leave_request:review"],
			},
			{
				branchId: "b-1",
				departmentId: "d-1",
				permissions: [
					"department:read",
					"member_profile:read",
					"leave_request:read",
					"leave_request:review",
				],
			},
		]);
	});

	it("counts only active assignments of active roles", () => {
		expect(
			accessSummary(
				[
					held("a-1", "viewer", {}, "INACTIVE"),
					held("a-2", "off", { branchId: "b-1" }),
					held("a-3", "missing", { branchId: "b-2" }),
				],
				ROLES
			)
		).toEqual([]);
	});

	it("leaves out keys that give nothing at a place's level and keys the app doesn't know", () => {
		expect(
			accessSummary(
				[
					// A legacy company role at a branch: its company-only key does nothing there.
					held("a-1", "creator", { branchId: "b-1" }),
					held("a-2", "newer", { departmentId: "d-1" }),
				],
				ROLES
			)
		).toEqual([
			{ branchId: "b-1", departmentId: null, permissions: ["branch:read"] },
			{
				branchId: null,
				departmentId: "d-1",
				permissions: ["member_note:read"],
			},
		]);
		expect(
			accessSummary([held("a-1", "creator", { departmentId: "d-1" })], ROLES)
		).toEqual([]);
	});

	it("previews a change: new places are added active, cleared ones go, the rest stays", () => {
		const current = [
			held("a-1", "viewer", { branchId: "b-1" }),
			held("a-2", "viewer", { branchId: "b-2" }),
			held("a-3", "approver", { branchId: "b-1" }),
		];

		expect(
			assignmentsAfter(
				current,
				"viewer",
				[{}, { branchId: "b-1" }],
				// b-2 is out of the person's reach, so it isn't among what they may change.
				[{ branchId: "b-1" }]
			)
		).toEqual([
			...current,
			{
				accessRoleAssignmentId: "",
				accessRoleId: "viewer",
				status: "ACTIVE",
				branchId: null,
				departmentId: null,
			},
		]);
		expect(
			assignmentsAfter(current, "viewer", [], [{ branchId: "b-1" }])
		).toEqual([current[1], current[2]]);
	});

	it("names places from the workspace, leaving out units it doesn't list", () => {
		const label = placeLabels(companyWideWorkspace([]), "c-1", t);

		expect(label({})).toBe("Whole company");
		expect(label({ branchId: "b-2" })).toBe("Tampines");
		expect(label({ branchId: null, departmentId: "d-1" })).toBe(
			"Orchard › Kitchen"
		);
		expect(label({ branchId: "b-9" })).toBeUndefined();
		expect(label({ departmentId: "d-9" })).toBeUndefined();
		expect(placeLabels(undefined, "c-1", t)({})).toBe("Whole company");
	});

	it("words each place's access per section of the role editor, dropping places it can't name", () => {
		expect(
			describeAccess(
				[
					{
						branchId: null,
						departmentId: null,
						permissions: [
							"department:read",
							"leave_request:read",
							"leave_request:review",
						],
					},
					{ branchId: "b-9", departmentId: null, permissions: ["branch:read"] },
				],
				placeLabels(companyWideWorkspace([]), "c-1", t),
				t
			)
		).toEqual([
			{
				place: "Whole company",
				// Section by section, in the role editor's order.
				lines: ["Leave: Manage", "Organisation: View"],
			},
		]);
	});
});
