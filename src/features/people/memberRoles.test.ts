import { describe, expect, it } from "vitest";
import type { AccessRole } from "@/features/organisation/api";
import type { TFunction } from "i18next";
import {
	departmentRoleChange,
	describeMemberRoles,
	memberRoles,
	roleNames,
	rolesByPlace,
	type MemberRole,
} from "@/features/people/memberRoles";

const role = (accessRoleId: string, name: string): AccessRole => ({
	accessRoleId,
	name,
	protectedRole: false,
	status: "ACTIVE",
	permissions: [],
	holderCount: 1,
});
const held = (
	assignmentId: string,
	accessRoleId: string,
	departmentId: string | null
): MemberRole => ({
	assignmentId,
	accessRoleId,
	name: accessRoleId,
	departmentId,
});
const kitchen = { branchId: "b-1", departmentId: "d-1" };
const bar = { branchId: "b-1", departmentId: "d-2" };

describe("member roles", () => {
	it("names the active assignments, leaving out inactive ones and unknown roles", () => {
		const roles = memberRoles(
			[
				{
					accessRoleAssignmentId: "a-1",
					accessRoleId: "r-1",
					status: "ACTIVE",
					branchId: null,
					departmentId: "d-1",
				},
				{
					accessRoleAssignmentId: "a-2",
					accessRoleId: "r-2",
					status: "INACTIVE",
					branchId: "b-1",
					departmentId: null,
				},
				{
					accessRoleAssignmentId: "a-3",
					accessRoleId: "r-9",
					status: "ACTIVE",
					branchId: null,
					departmentId: null,
				},
				{
					accessRoleAssignmentId: "a-4",
					accessRoleId: "r-1",
					status: "ACTIVE",
					branchId: "b-2",
					departmentId: null,
				},
			],
			[role("r-1", "Supervisor"), role("r-2", "Admin")]
		);

		expect(roles).toEqual([
			{
				assignmentId: "a-1",
				accessRoleId: "r-1",
				name: "Supervisor",
				departmentId: "d-1",
			},
			{
				assignmentId: "a-4",
				accessRoleId: "r-1",
				name: "Supervisor",
				departmentId: null,
			},
		]);
		expect(roleNames(roles)).toEqual(["Supervisor"]);
	});

	it("tells the role at the person's department from those elsewhere", () => {
		const atKitchen = held("a-1", "r-1", "d-1");
		const companyWide = held("a-2", "r-2", null);

		expect(rolesByPlace([companyWide, atKitchen], "d-1")).toEqual({
			atDepartment: atKitchen,
			elsewhere: [companyWide],
		});
		expect(rolesByPlace([atKitchen], null)).toEqual({
			atDepartment: undefined,
			elsewhere: [atKitchen],
		});
	});
});

describe("department role change", () => {
	const change = (
		chosen: string,
		place: typeof kitchen | undefined,
		current: MemberRole | "none" = held("a-1", "r-1", "d-1")
	): ReturnType<typeof departmentRoleChange> =>
		departmentRoleChange({
			membershipId: "m-1",
			held: current === "none" ? undefined : current,
			chosen,
			place,
		});

	it("changes nothing when neither the role nor the department changed", () => {
		expect(change("r-1", kitchen)).toBeUndefined();
		expect(change("", kitchen, "none")).toBeUndefined();
		expect(change("r-1", undefined, "none")).toBeUndefined();
	});

	it("replaces the role at the department", () => {
		expect(change("r-2", kitchen)).toEqual({
			grants: [{ companyMembershipId: "m-1", accessRoleId: "r-2", ...kitchen }],
			revokes: ["a-1"],
		});
	});

	it("moves the role with the person to their new department", () => {
		expect(change("r-1", bar)).toEqual({
			grants: [{ companyMembershipId: "m-1", accessRoleId: "r-1", ...bar }],
			revokes: ["a-1"],
		});
	});

	it("removes the role when none is chosen or the department is cleared", () => {
		expect(change("", kitchen)).toEqual({ grants: [], revokes: ["a-1"] });
		expect(change("r-1", undefined)).toEqual({ grants: [], revokes: ["a-1"] });
	});

	it("grants a first role", () => {
		expect(change("r-2", kitchen, "none")).toEqual({
			grants: [{ companyMembershipId: "m-1", accessRoleId: "r-2", ...kitchen }],
			revokes: [],
		});
	});
});

describe("member roles in words", () => {
	const t = ((key: string) => key) as TFunction;

	it("names each role once, a dash for none, and leaves out what may not be read", () => {
		expect(
			describeMemberRoles(
				{
					status: "ready",
					roles: [
						{ ...held("a-1", "r-1", "d-1"), name: "Supervisor" },
						{ ...held("a-2", "r-2", null), name: "Admin" },
						{ ...held("a-3", "r-1", null), name: "Supervisor" },
					],
				},
				t
			)
		).toBe("Supervisor, Admin");
		expect(describeMemberRoles({ status: "ready", roles: [] }, t)).toBe(
			"people.notSet"
		);
		expect(describeMemberRoles({ status: "hidden" }, t)).toBeUndefined();
		expect(describeMemberRoles({ status: "error" }, t)).toBe(
			"people.profile.rolesFailed"
		);
	});
});
