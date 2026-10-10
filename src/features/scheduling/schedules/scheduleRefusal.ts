import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

/**
 * The refusals of the schedules API, as `"<status> <errorCode>"`. Every code
 * is named here once, so a code the API settles on differently is a
 * one-line change.
 */
export const SCHEDULE_REFUSAL_CODES = {
	periodNotMonday: "400 SCHEDULE_PERIOD_NOT_MONDAY",
	invalidName: "400 INVALID_SCHEDULE_NAME",
	notDraft: "409 SCHEDULE_NOT_DRAFT",
	scheduleNotFound: "404 SCHEDULE_NOT_FOUND",
	departmentInactive: "409 DEPARTMENT_INACTIVE",
	departmentNotFound: "404 DEPARTMENT_NOT_FOUND",
} as const;

const codes = SCHEDULE_REFUSAL_CODES;

/** The setup fields a refused save can land on. */
export type ScheduleField = "name" | "periodStart";

/**
 * Why creating or saving a draft was refused: on a setup field, or as one
 * message. `creating` picks the copy for a draft that does not exist yet.
 */
export const scheduleRefusal = (
	error: unknown,
	creating: boolean,
	t: TFunction
): Refusal<ScheduleField> => {
	const key = "scheduling.draft";
	const field = (field: ScheduleField, message: string) =>
		({ field, message }) as const;
	return mapRefusal<ScheduleField>(error, {
		codes: {
			[codes.periodNotMonday]: field("periodStart", t(`${key}.periodRejected`)),
			[codes.invalidName]: field("name", t(`${key}.nameRejected`)),
		},
		alerts: {
			[codes.notDraft]: t(`${key}.notDraft`),
			[codes.scheduleNotFound]: t(`${key}.gone`),
			[codes.departmentInactive]: t(
				"scheduling.shifts.dialog.departmentInactive"
			),
			[codes.departmentNotFound]: t("scheduling.shifts.dialog.departmentGone"),
		},
		fieldErrors: {
			name: field("name", t(`${key}.nameRejected`)),
			periodStart: field("periodStart", t(`${key}.periodRejected`)),
		},
		forbidden: t(creating ? `${key}.createForbidden` : `${key}.saveForbidden`),
		failed: t(creating ? `${key}.createFailed` : `${key}.saveFailed`),
	});
};

/** A refusal as one message, for where a field can't show it (e.g. Save Draft). */
export const scheduleRefusalMessage = (
	error: unknown,
	creating: boolean,
	t: TFunction
): string => {
	const refusal = scheduleRefusal(error, creating, t);
	return (
		refusal.message ??
		Object.values(refusal.fields)[0] ??
		t(
			creating ? "scheduling.draft.createFailed" : "scheduling.draft.saveFailed"
		)
	);
};
