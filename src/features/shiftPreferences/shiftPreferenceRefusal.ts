import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/common/refusal";

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

/**
 * Why saving a day's preferences was refused, said as the dialog's alert;
 * `maxShifts` is the day's limit, named in the too-many message. Server codes
 * select frontend-owned copy only.
 */
export const shiftPreferenceRefusal = (
	error: unknown,
	maxShifts: number,
	t: TFunction
): Refusal<never> => {
	const key = "shiftPreferences.dialog";
	return mapRefusal<never>(error, {
		alerts: {
			[codes.dateOutOfRange]: t(`${key}.dateOutOfRange`),
			[codes.tooManyShifts]: t("shiftPreferences.limit", { max: maxShifts }),
			[codes.shiftNotChoosable]: t(`${key}.shiftNotChoosable`),
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};
