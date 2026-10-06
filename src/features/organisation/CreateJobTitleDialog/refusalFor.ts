import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

export type JobTitleField = "departmentId" | "name";

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	name: string,
	editing: boolean,
	t: TFunction
): Refusal<JobTitleField> => {
	const key = "organisation.jobTitles.createDialog";
	return mapRefusal<JobTitleField>(error, {
		codes: {
			"409 JOB_TITLE_NAME_CONFLICT": {
				field: "name",
				message: t(`${key}.nameConflict`, { name: name.trim() }),
			},
			"400 INVALID_JOB_TITLE_NAME": {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
			"409 DEPARTMENT_INACTIVE": {
				field: "departmentId",
				message: t(`${key}.departmentInactive`),
			},
			// The chosen department or its branch was deactivated or removed since the list loaded.
			"404 DEPARTMENT_NOT_FOUND": {
				field: "departmentId",
				message: t(`${key}.departmentUnavailable`),
			},
			"404 BRANCH_NOT_FOUND": {
				field: "departmentId",
				message: t(`${key}.departmentUnavailable`),
			},
		},
		alerts: { "404 JOB_TITLE_NOT_FOUND": t(`${key}.gone`) },
		fieldErrors: { name: { field: "name", message: t(`${key}.nameRejected`) } },
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.forbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.failed`),
	});
};
