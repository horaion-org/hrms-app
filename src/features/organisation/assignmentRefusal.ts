import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal } from "@/features/organisation/refusal";

/** The API's stable codes for refusing to assign an access role. */
export const ASSIGNMENT_ERROR = {
	conflict: "ACCESS_ROLE_ASSIGNMENT_CONFLICT",
	invalid: "INVALID_ACCESS_ROLE_ASSIGNMENT",
	roleInactive: "ACCESS_ROLE_INACTIVE",
} as const;

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const assignmentRefusal = (error: unknown, t: TFunction): string => {
	const key = "organisation.accessRoles.assignments.dialog";
	if (error instanceof ApiProblemError) {
		if (error.status === 409 && error.errorCode === ASSIGNMENT_ERROR.conflict)
			return t(`${key}.conflict`);
		if (error.status === 400 && error.errorCode === ASSIGNMENT_ERROR.invalid)
			return t(`${key}.notMember`);
		if (error.status === 403) return t(`${key}.forbidden`);
	}
	return t(`${key}.failed`);
};

/** Why one person's assignment could not be activated or deactivated, in the app's own words. */
export const assignmentStatusRefusal = (
	error: unknown,
	t: TFunction
): string => {
	const key = "organisation.accessRoles.assignments.status";
	return (
		mapRefusal(error, {
			alerts: {
				[`409 ${ASSIGNMENT_ERROR.roleInactive}`]: t(`${key}.roleInactive`),
				[`400 ${ASSIGNMENT_ERROR.invalid}`]: t(`${key}.notMember`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};
