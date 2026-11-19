import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/common/refusal";
import { PROFILE_REFUSAL_CODES } from "@/features/people/profileRefusal";

/**
 * The refusals of saving a day's preferences, as `"<status> <errorCode>"`.
 * Every code is named here once.
 */
export const SHIFT_PREFERENCE_REFUSAL_CODES = {
	/** The day is before today or more than eight weeks ahead. */
	dateOutOfRange: "400 SHIFT_PREFERENCE_DATE_OUT_OF_RANGE",
	/** More shifts were sent than one day may hold. */
	tooManyShifts: "400 SHIFT_PREFERENCE_TOO_MANY_SHIFTS",
	/** A shift is no longer one the caller may prefer that day. */
	shiftNotChoosable: "400 SHIFT_PREFERENCE_SHIFT_NOT_CHOOSABLE",
} as const;

const codes = SHIFT_PREFERENCE_REFUSAL_CODES;

/** The day's rules, said the same whoever's day it is; `maxShifts` is named in the too-many message. */
const dayRuleAlerts = (
	maxShifts: number,
	t: TFunction
): Record<string, string> => ({
	[codes.dateOutOfRange]: t("shiftPreferences.dialog.dateOutOfRange"),
	[codes.tooManyShifts]: t("shiftPreferences.limit", { max: maxShifts }),
	[codes.shiftNotChoosable]: t("shiftPreferences.dialog.shiftNotChoosable"),
});

/**
 * Why saving a day of the caller's own preferences was refused, said as the
 * dialog's alert; `maxShifts` is the day's limit, named in the too-many
 * message. Server codes select frontend-owned copy only.
 */
export const shiftPreferenceRefusal = (
	error: unknown,
	maxShifts: number,
	t: TFunction
): Refusal<never> => {
	const key = "shiftPreferences.dialog";
	return mapRefusal<never>(error, {
		alerts: dayRuleAlerts(maxShifts, t),
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};

/**
 * Why saving a day of a member's preferences was refused: the day's rules as
 * for the member's own, and a member no longer in the caller's reach.
 * Server codes select frontend-owned copy only.
 */
export const memberShiftPreferenceRefusal = (
	error: unknown,
	maxShifts: number,
	t: TFunction
): Refusal<never> => {
	const key = "shiftPreferences.member";
	return mapRefusal<never>(error, {
		alerts: {
			...dayRuleAlerts(maxShifts, t),
			[PROFILE_REFUSAL_CODES.profileNotFound]: t(`${key}.notFound`),
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.saveFailed`),
	});
};
