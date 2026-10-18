import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

export type DepartmentField = "branchId" | "name" | "heads";

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	name: string,
	t: TFunction,
	editing = false
): Refusal<DepartmentField> => {
	const key = "organisation.departments.createDialog";
	return mapRefusal<DepartmentField>(error, {
		codes: {
			"409 DEPARTMENT_NAME_CONFLICT": {
				field: "name",
				message: t(`${key}.nameConflict`, { name: name.trim() }),
			},
			"400 INVALID_DEPARTMENT_NAME": {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
			"400 INVALID_INITIAL_DEPARTMENT_HEAD": {
				field: "heads",
				message: t(`${key}.headsUnavailable`),
				refreshMembers: true,
			},
			// The chosen branch was deactivated or removed since the list loaded.
			"404 BRANCH_NOT_FOUND": editing
				? undefined
				: {
						field: "branchId",
						message: t(`${key}.branchUnavailable`),
						refreshMembers: true,
					},
		},
		alerts: {
			"404 DEPARTMENT_NOT_FOUND": t(`${key}.gone`),
			"404 BRANCH_NOT_FOUND": t(`${key}.gone`),
		},
		fieldErrors: {
			name: { field: "name", message: t(`${key}.nameRejected`) },
			initialHeadCompanyMembershipIds: {
				field: "heads",
				message: t(`${key}.headsRejected`),
			},
		},
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.forbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.failed`),
	});
};
