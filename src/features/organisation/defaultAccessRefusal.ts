import type { TFunction } from "i18next";
import { mapRefusal } from "@/common/refusal";

/** The API's stable codes for refusing a change to default access (API ADR-0118). */
export const DEFAULT_ACCESS_ERROR = {
	invalidRule: "400 INVALID_DEFAULT_ACCESS_RULE",
	roleInactive: "409 ACCESS_ROLE_INACTIVE",
	kindConflict: "400 ACCESS_ROLE_KIND_CONFLICT",
	scopeIncompatible: "400 ACCESS_ROLE_SCOPE_INCOMPATIBLE",
	duplicate: "409 DEFAULT_ACCESS_RULE_CONFLICT",
	branchGone: "404 BRANCH_NOT_FOUND",
	departmentGone: "404 DEPARTMENT_NOT_FOUND",
	notMember: "400 INVALID_DEFAULT_ACCESS_RECIPIENT",
} as const;

const key = "organisation.accessRoles.defaults.refusals";

/**
 * Why adding or removing a default, or giving or stopping someone's
 * default access, was refused, in the app's own words; each says what to
 * do. Server codes only select copy; server prose is never shown.
 */
export const defaultAccessRefusal = (error: unknown, t: TFunction): string => {
	const failed = t(`${key}.failed`);
	return (
		mapRefusal(error, {
			alerts: {
				[DEFAULT_ACCESS_ERROR.invalidRule]: t(`${key}.invalidRule`),
				[DEFAULT_ACCESS_ERROR.roleInactive]: t(`${key}.inactive`),
				[DEFAULT_ACCESS_ERROR.kindConflict]: t(`${key}.kind`),
				[DEFAULT_ACCESS_ERROR.scopeIncompatible]: t(`${key}.scope`),
				[DEFAULT_ACCESS_ERROR.duplicate]: t(`${key}.duplicate`),
				[DEFAULT_ACCESS_ERROR.branchGone]: t(`${key}.placeGone`),
				[DEFAULT_ACCESS_ERROR.departmentGone]: t(`${key}.placeGone`),
				[DEFAULT_ACCESS_ERROR.notMember]: t(`${key}.notMember`),
			},
			forbidden: t(`${key}.forbidden`),
			failed,
		}).message ?? failed
	);
};
