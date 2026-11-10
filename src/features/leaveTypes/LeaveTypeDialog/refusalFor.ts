import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/common/refusal";

export type LeaveTypeField = "name";

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	name: string,
	editing: boolean,
	t: TFunction
): Refusal<LeaveTypeField> => {
	const key = "settings.leave.dialog";
	return mapRefusal<LeaveTypeField>(error, {
		codes: {
			"409 LEAVE_TYPE_NAME_CONFLICT": {
				field: "name",
				message: t(`${key}.nameConflict`, { name: name.trim() }),
			},
			"400 INVALID_LEAVE_TYPE_NAME": {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
		},
		alerts: {
			"409 LEAVE_TYPE_KIND_LOCKED": t(`${key}.kindLocked`),
			"409 LEAVE_TYPE_SYSTEM": t(`${key}.system`),
			"404 LEAVE_TYPE_NOT_FOUND": t(`${key}.gone`),
		},
		fieldErrors: {
			name: { field: "name", message: t(`${key}.nameRejected`) },
		},
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.forbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.failed`),
	});
};
