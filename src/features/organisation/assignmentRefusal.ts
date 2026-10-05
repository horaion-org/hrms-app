import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";

/** The API's stable codes for refusing to assign an access role. */
export const ASSIGNMENT_ERROR = {
	conflict: "ACCESS_ROLE_ASSIGNMENT_CONFLICT",
	invalid: "INVALID_ACCESS_ROLE_ASSIGNMENT",
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
