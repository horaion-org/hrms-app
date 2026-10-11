import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal } from "@/features/organisation/refusal";
import {
	firstFailure,
	PartialChangeError,
} from "@/features/organisation/useAccessRoleHolders";

/** The API's stable codes for refusing to assign an access role. */
export const ASSIGNMENT_ERROR = {
	conflict: "ACCESS_ROLE_ASSIGNMENT_CONFLICT",
	invalid: "INVALID_ACCESS_ROLE_ASSIGNMENT",
	roleInactive: "ACCESS_ROLE_INACTIVE",
} as const;

/**
 * Says how many of several independent changes failed, before the reason
 * for the first one, so a partly applied change never reads as all done or
 * all failed. A change that failed as a whole is explained by `reason` alone.
 */
const withOutcome = (error: unknown, reason: string, t: TFunction): string =>
	error instanceof PartialChangeError
		? t("organisation.accessRoles.assignments.partial", {
				failed: error.failures.length,
				total: error.total,
				reason,
			})
		: reason;

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const assignmentRefusal = (error: unknown, t: TFunction): string => {
	const key = "organisation.accessRoles.assignments.dialog";
	const cause = firstFailure(error);
	let reason = t(`${key}.failed`);
	if (cause instanceof ApiProblemError) {
		if (cause.status === 409 && cause.errorCode === ASSIGNMENT_ERROR.conflict)
			reason = t(`${key}.conflict`);
		else if (
			cause.status === 400 &&
			cause.errorCode === ASSIGNMENT_ERROR.invalid
		)
			reason = t(`${key}.notMember`);
		else if (cause.status === 403) reason = t(`${key}.forbidden`);
	}
	return withOutcome(error, reason, t);
};

/** Why one person's assignment could not be activated or deactivated, in the app's own words. */
export const assignmentStatusRefusal = (
	error: unknown,
	t: TFunction
): string => {
	const key = "organisation.accessRoles.assignments.status";
	const reason =
		mapRefusal(firstFailure(error), {
			alerts: {
				[`409 ${ASSIGNMENT_ERROR.roleInactive}`]: t(`${key}.roleInactive`),
				[`400 ${ASSIGNMENT_ERROR.invalid}`]: t(`${key}.notMember`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`);
	return withOutcome(error, reason, t);
};

/** Why removing a role from a person failed, wholly or for some of their places. */
export const assignmentRemoveRefusal = (error: unknown, t: TFunction): string =>
	withOutcome(error, t("organisation.accessRoles.assignments.removeFailed"), t);
