import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";
import { SCHEDULE_REFUSAL_CODES } from "@/features/scheduling/schedules/scheduleRefusal";

/**
 * The refusals of the shifts API, as `"<status> <errorCode>"`. Every
 * code is named here once, so a code the API settles on differently is a
 * one-line change.
 */
export const SHIFT_REFUSAL_CODES = {
	shiftNameConflict: "409 SHIFT_NAME_CONFLICT",
	shiftRoleNotInDepartment: "400 SHIFT_ROLE_NOT_IN_DEPARTMENT",
	shiftNotFound: "404 SHIFT_NOT_FOUND",
	departmentInactive: "409 DEPARTMENT_INACTIVE",
	departmentNotFound: "404 DEPARTMENT_NOT_FOUND",
} as const;

const codes = SHIFT_REFUSAL_CODES;

/** The fields a refused shift can land on. */
export type ShiftField =
	| "name"
	| "group"
	| "colour"
	| "startTime"
	| "endTime"
	| "days"
	| "jobTitleIds";

/** Why adding or editing a shift was refused: on a field, or as the dialog's alert. */
export const shiftRefusal = (
	error: unknown,
	name: string,
	editing: boolean,
	t: TFunction
): Refusal<ShiftField> => {
	const key = "scheduling.shifts.dialog";
	const field = (field: ShiftField, message: string) =>
		({ field, message }) as const;
	return mapRefusal<ShiftField>(error, {
		codes: {
			[codes.shiftNameConflict]: field(
				"name",
				t(`${key}.nameConflict`, { name })
			),
			[codes.shiftRoleNotInDepartment]: field(
				"jobTitleIds",
				t(`${key}.roleRejected`)
			),
		},
		alerts: {
			[codes.departmentInactive]: t(`${key}.departmentInactive`),
			[codes.departmentNotFound]: t(`${key}.departmentGone`),
			[codes.shiftNotFound]: t(`${key}.gone`),
			[SCHEDULE_REFUSAL_CODES.notDraft]: t("scheduling.draft.notDraft"),
			[SCHEDULE_REFUSAL_CODES.scheduleNotFound]: t("scheduling.draft.gone"),
		},
		fieldErrors: {
			name: field("name", t(`${key}.nameRejected`)),
			group: field("group", t(`${key}.groupRequired`)),
			colour: field("colour", t(`${key}.colourRequired`)),
			startTime: field("startTime", t(`${key}.timeRejected`)),
			endTime: field("endTime", t(`${key}.timeRejected`)),
			days: field("days", t(`${key}.daysRequired`)),
			jobTitleIds: field("jobTitleIds", t(`${key}.roleRejected`)),
		},
		forbidden: t(editing ? `${key}.editForbidden` : `${key}.forbidden`),
		failed: t(editing ? `${key}.editFailed` : `${key}.failed`),
	});
};

/** Why deleting a shift was refused, as one message for the page. */
export const deleteShiftRefusal = (error: unknown, t: TFunction): string => {
	const key = "scheduling.shifts";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.shiftNotFound]: t(`${key}.dialog.gone`),
				[SCHEDULE_REFUSAL_CODES.notDraft]: t("scheduling.draft.notDraft"),
				[SCHEDULE_REFUSAL_CODES.scheduleNotFound]: t("scheduling.draft.gone"),
			},
			forbidden: t(`${key}.deleteForbidden`),
			failed: t(`${key}.deleteFailed`),
		}).message ?? t(`${key}.deleteFailed`)
	);
};

/** Why saving which shifts the schedule includes was refused, as one message for the page. */
export const inclusionRefusal = (error: unknown, t: TFunction): string =>
	mapRefusal<never>(error, {
		alerts: {
			[codes.shiftNotFound]: t("scheduling.draft.shiftGone"),
			[SCHEDULE_REFUSAL_CODES.notDraft]: t("scheduling.draft.notDraft"),
			[SCHEDULE_REFUSAL_CODES.scheduleNotFound]: t("scheduling.draft.gone"),
		},
		forbidden: t("scheduling.shifts.inclusionForbidden"),
		failed: t("scheduling.draft.saveFailed"),
	}).message ?? t("scheduling.draft.saveFailed");
