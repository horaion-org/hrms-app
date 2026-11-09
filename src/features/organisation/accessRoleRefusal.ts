import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import type { AccessRoleKind } from "@/features/organisation/api";
import { mapRefusal } from "@/features/organisation/refusal";

/** The API's stable codes for refusing a change to an access role. */
export const ACCESS_ROLE_ERROR = {
	nameConflict: "ACCESS_ROLE_NAME_CONFLICT",
	protectedRole: "PROTECTED_ACCESS_ROLE",
	inUse: "ACCESS_ROLE_IN_USE",
	kindConflict: "ACCESS_ROLE_KIND_CONFLICT",
} as const;

/**
 * Why the API refused a role's kind, for the Role type field. Only the
 * code is read, so the kind sent tells the cases apart: a local role was
 * sent with company-only permissions, or a role given at Branches or
 * Departments was sent as a company role.
 */
export const kindConflictMessage = (
	kind: AccessRoleKind,
	t: TFunction
): string =>
	t(
		kind === "COMPANY"
			? "organisation.accessRoles.kind.conflictCompany"
			: "organisation.accessRoles.kind.conflictLocal"
	);

/** What to tell the person: an error on the name or Role type field, or one for the whole form. */
export type AccessRoleRefusal = {
	name?: string;
	kind?: string;
	message?: string;
};

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const accessRoleRefusal = (
	error: unknown,
	{ name, kind }: { name: string; kind: AccessRoleKind },
	t: TFunction
): AccessRoleRefusal => {
	const key = "organisation.accessRoles.editor";
	if (error instanceof ApiProblemError) {
		if (
			error.status === 409 &&
			error.errorCode === ACCESS_ROLE_ERROR.nameConflict
		)
			return { name: t(`${key}.nameConflict`, { name }) };
		if (
			error.status === 400 &&
			error.errorCode === ACCESS_ROLE_ERROR.kindConflict
		)
			return { kind: kindConflictMessage(kind, t) };
		if (
			error.status === 409 &&
			error.errorCode === ACCESS_ROLE_ERROR.protectedRole
		)
			return { message: t(`${key}.protectedRefused`) };
		if (error.status === 404) return { message: t(`${key}.gone`) };
		if (error.status === 403) return { message: t(`${key}.forbidden`) };
		if (
			error.status === 400 &&
			error.fieldErrors.some(({ field }) => field === "name")
		)
			return { name: t(`${key}.nameRejected`) };
	}
	return { message: t(`${key}.failed`) };
};

/** Why a role could not be activated, deactivated or deleted from its list row, in the app's own words. */
export const accessRoleRowRefusal = (
	error: unknown,
	change: "status" | "delete",
	t: TFunction
): string => {
	const failed = t(`organisation.accessRoles.${change}.failed`);
	return (
		mapRefusal(error, {
			alerts: {
				[`409 ${ACCESS_ROLE_ERROR.inUse}`]: t(
					"organisation.accessRoles.delete.inUse"
				),
			},
			forbidden: t(`organisation.accessRoles.${change}.forbidden`),
			failed,
		}).message ?? failed
	);
};
