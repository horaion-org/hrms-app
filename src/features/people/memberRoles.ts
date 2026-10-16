import type { TFunction } from "i18next";
import type {
	AccessRole,
	MemberAccessRoleAssignment,
} from "@/features/organisation/api";
import type { AccessRoleHoldersChange } from "@/features/organisation/useAccessRoleHolders";

/** One system role a person holds, and where. */
export type MemberRole = {
	assignmentId: string;
	accessRoleId: string;
	name: string;
	/** Set for a role held at a Department; null at a Branch or company-wide. */
	departmentId: string | null;
	branchId?: string | null;
	protectedRole?: boolean;
};

/** A person's system roles as loaded, or why they aren't shown. */
export type MemberRoles =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; roles: Array<MemberRole> };

/**
 * The roles a person's active assignments give them, named. An inactive
 * assignment gives nothing, and one of a role not in the list is left out.
 */
export const memberRoles = (
	assignments: ReadonlyArray<MemberAccessRoleAssignment>,
	roles: ReadonlyArray<AccessRole>
): Array<MemberRole> =>
	assignments.flatMap((assignment) => {
		const role = roles.find(
			(candidate) => candidate.accessRoleId === assignment.accessRoleId
		);
		return assignment.status === "ACTIVE" && role
			? [
					{
						assignmentId: assignment.accessRoleAssignmentId,
						accessRoleId: assignment.accessRoleId,
						name: role.name,
						departmentId: assignment.departmentId,
						branchId: assignment.branchId,
						protectedRole: role.protectedRole,
					},
				]
			: [];
	});

/** The names of the roles a person holds, each once. */
export const roleNames = (roles: ReadonlyArray<MemberRole>): Array<string> => [
	...new Set(roles.map((role) => role.name)),
];

/**
 * Select an editable assignment for the form, preferring the person's
 * department. Other assignments are displayed but preserved.
 */
export const rolesByPlace = (
	roles: ReadonlyArray<MemberRole>,
	departmentId: string | null
): { selected: MemberRole | undefined; elsewhere: Array<MemberRole> } => {
	const selected =
		roles.find(
			(role) =>
				!role.protectedRole &&
				departmentId &&
				role.departmentId === departmentId
		) ?? roles.find((role) => !role.protectedRole);
	return {
		selected,
		elsewhere: roles.filter((role) => role !== selected),
	};
};

/**
 * Replace the selected assignment only when its role or explicit target
 * changes. Organisational placement is not an input.
 */
export const memberRoleChange = ({
	membershipId,
	held,
	chosen,
	place,
}: {
	membershipId: string;
	/** The selected assignment before saving. */
	held: MemberRole | undefined;
	/** The role chosen in the form; "" for none. */
	chosen: string;
	/** The independently selected target; an empty object means company-wide. */
	place: { branchId?: string; departmentId?: string } | undefined;
}):
	Required<Pick<AccessRoleHoldersChange, "grants" | "revokes">> | undefined => {
	if (
		held?.accessRoleId === (chosen || undefined) &&
		(held?.departmentId ?? undefined) === place?.departmentId &&
		(held?.departmentId || (held?.branchId ?? undefined) === place?.branchId)
	)
		return undefined;
	const grants =
		chosen && place
			? [
					{
						companyMembershipId: membershipId,
						accessRoleId: chosen,
						branchId: place.branchId,
						departmentId: place.departmentId,
					},
				]
			: [];
	const revokes = held ? [held.assignmentId] : [];
	return grants.length + revokes.length > 0 ? { grants, revokes } : undefined;
};

/**
 * A person's system roles in words for their profile, or undefined when the
 * person may not read roles, which leaves the row out.
 */
export const describeMemberRoles = (
	roles: MemberRoles,
	t: TFunction
): string | undefined => {
	switch (roles.status) {
		case "hidden":
			return undefined;
		case "pending":
			return t("organisation.list.loading");
		case "error":
			return t("people.profile.rolesFailed");
		case "ready":
			return roleNames(roles.roles).join(", ") || t("people.notSet");
		default: {
			const exhaustive: never = roles;
			return exhaustive;
		}
	}
};
