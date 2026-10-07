import type { TFunction } from "i18next";
import type {
	AccessRole,
	MemberAccessRoleAssignment,
} from "@/features/organisation/api";
import type { AccessRoleHoldersChange } from "@/features/organisation/useAccessRoleHolders";
import type { MemberProfilePlace } from "@/features/people/api";

/** One system role a person holds, and where. */
export type MemberRole = {
	assignmentId: string;
	accessRoleId: string;
	name: string;
	/** Set for a role held at a Department; null at a Branch or company-wide. */
	departmentId: string | null;
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
					},
				]
			: [];
	});

/** The names of the roles a person holds, each once. */
export const roleNames = (roles: ReadonlyArray<MemberRole>): Array<string> => [
	...new Set(roles.map((role) => role.name)),
];

/**
 * The role a person holds at their Department, which the profile form
 * changes, and the ones held elsewhere, which it only shows.
 */
export const rolesByPlace = (
	roles: ReadonlyArray<MemberRole>,
	departmentId: string | null
): { atDepartment: MemberRole | undefined; elsewhere: Array<MemberRole> } => {
	const atDepartment = departmentId
		? roles.find((role) => role.departmentId === departmentId)
		: undefined;
	return {
		atDepartment,
		elsewhere: roles.filter((role) => role !== atDepartment),
	};
};

/**
 * What saving a profile does to the role at the person's Department: the
 * chosen role is granted at the Department they are now in, and the one held
 * at their previous Department is removed. Nothing when neither changed.
 */
export const departmentRoleChange = ({
	membershipId,
	held,
	chosen,
	place,
}: {
	membershipId: string;
	/** The role held at the Department the person was in before saving. */
	held: MemberRole | undefined;
	/** The role chosen in the form; "" for none. */
	chosen: string;
	/** The Department they are in after saving, if any. */
	place: MemberProfilePlace | undefined;
}):
	Required<Pick<AccessRoleHoldersChange, "grants" | "revokes">> | undefined => {
	if (
		held?.accessRoleId === (chosen || undefined) &&
		held?.departmentId === place?.departmentId
	)
		return undefined;
	const grants =
		chosen && place
			? [{ companyMembershipId: membershipId, accessRoleId: chosen, ...place }]
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
