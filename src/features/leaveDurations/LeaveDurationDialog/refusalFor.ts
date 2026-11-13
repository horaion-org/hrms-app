import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/common/refusal";

export type LeaveDurationField = "name" | "endTime";

/** Server codes select frontend-owned copy; untrusted server prose is never displayed. */
export const refusalFor = (
	error: unknown,
	editing: boolean,
	t: TFunction
): Refusal<LeaveDurationField> => {
	const key = "settings.leave.durationDialog";
	return mapRefusal<LeaveDurationField>(error, {
		codes: {
			"409 LEAVE_DURATION_NAME_CONFLICT": {
				field: "name",
				message: t(`${key}.nameConflict`),
			},
			"400 INVALID_LEAVE_DURATION_NAME": {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
			"400 INVALID_LEAVE_DURATION_TIMES": {
				field: "endTime",
				message: t(`${key}.timesEqual`),
			},
		},
		alerts: {
			"403 LEAVE_DURATION_NOT_COVERED": t(`${key}.notCovered`),
			"404 LEAVE_DURATION_NOT_FOUND": t(`${key}.gone`),
			"400 INVALID_UNIT_REACH": t(`${key}.reachRejected`),
		},
		fieldErrors: {
			name: { field: "name", message: t(`${key}.nameRejected`) },
			endTime: { field: "endTime", message: t(`${key}.timesEqual`) },
		},
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.forbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.failed`),
	});
};
