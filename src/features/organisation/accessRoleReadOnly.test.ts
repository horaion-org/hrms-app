import { describe, expect, it } from "vitest";
import {
	changeablePart,
	mayAssignRole,
	whoCanAssign,
} from "@/features/organisation/accessRoleReadOnly";
import type { AccessRolePerson } from "@/features/organisation/AccessRoleAssignments";
import type { AccessRole } from "@/features/organisation/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import type { ScopeRef } from "@/features/workspace/scopes";

const role = (overrides: Partial<AccessRole> = {}): AccessRole => ({
	accessRoleId: "r-1",
	name: "Manager",
	protectedRole: false,
	protectedRoleType: null,
	kind: "LOCAL",
	status: "ACTIVE",
	permissions: ["branch:read"],
	holderCount: 0,
	...overrides,
});
const systemOwner = role({
	name: "System Owner",
	protectedRole: true,
	protectedRoleType: "SYSTEM_OWNER",
	kind: "COMPANY",
});
const systemAdmin = role({
	name: "System Admin",
	protectedRole: true,
	protectedRoleType: "SYSTEM_ADMIN",
	kind: "COMPANY",
});

/** What a person holds company-wide, as `useAccess` answers it. */
const holding = (
	keys: ReadonlyArray<PermissionKey>
): Parameters<typeof mayAssignRole>[1] => ({
	can: (permission) => keys.includes(permission),
	canAnywhere: (permission) => keys.includes(permission),
});
const owner = holding([
	"access_role:assign",
	"access_role:assign_system_admin",
]);
const admin = holding(["access_role:assign"]);
const reader = holding(["access_role:read"]);

describe("who may change who holds a role (API ADR-0108)", () => {
	it("lets the System Owner and a System Admin change a custom role, and nobody else", () => {
		expect(mayAssignRole(role(), owner)).toBe(true);
		expect(mayAssignRole(role(), admin)).toBe(true);
		expect(mayAssignRole(role(), reader)).toBe(false);
	});

	it("lets only the System Owner change the System Admin role", () => {
		expect(mayAssignRole(systemAdmin, owner)).toBe(true);
		expect(mayAssignRole(systemAdmin, admin)).toBe(false);
	});

	it("never lets anyone change the System Owner role", () => {
		expect(mayAssignRole(systemOwner, owner)).toBe(false);
	});

	it("names which sentence says who can, by the role", () => {
		expect(whoCanAssign(role())).toBe("CUSTOM");
		expect(whoCanAssign(systemAdmin)).toBe("SYSTEM_ADMIN");
		expect(whoCanAssign(systemOwner)).toBe("SYSTEM_OWNER");
	});
});

describe("changeablePart", () => {
	const person: AccessRolePerson = {
		membershipId: "m-1",
		name: "Daniel Tan",
		status: "ACTIVE",
		places: [
			{
				assignmentId: "a-1",
				membershipId: "m-1",
				name: "Daniel Tan",
				status: "INACTIVE",
				branchId: "b-1",
				branchName: "Orchard",
				departmentId: "d-1",
				departmentName: "Kitchen",
			},
			{
				assignmentId: "a-2",
				membershipId: "m-1",
				name: "Daniel Tan",
				status: "ACTIVE",
				branchId: "b-2",
				branchName: "Tampines",
			},
		],
	};
	/** May assign at the Kitchen Department only. */
	const kitchenOnly = (_: PermissionKey, target: ScopeRef): boolean =>
		target.kind === "department" && target.id === "d-1";

	it("keeps only the places the person may assign at, with the status they alone add up to", () => {
		expect(changeablePart(person, kitchenOnly)).toEqual({
			...person,
			places: [person.places[0]],
			status: "INACTIVE",
		});
	});

	it("keeps every place when all are in reach", () => {
		expect(changeablePart(person, () => true)).toEqual(person);
	});
});
