import type { TFunction } from "i18next";
import { humaniseIdentifier } from "@/features/scheduling/roster/findings/ruleLabel";

/*
 * A day's type (a day off, a rest day, …) is data the API sends, never a list
 * the app keeps: a type added later still reads, by its code made readable,
 * until it gets a translation.
 */

/**
 * A day type in words: its translation, else its code made readable
 * ("PUBLIC_HOLIDAY_OFF" → "Public holiday off"). With a `count` it takes the
 * plural a sentence needs ("2 Rest days"); a type with no plural reads as its
 * singular. Pure.
 */
export const dayTypeLabel = (code: string, t: TFunction, count = 1): string =>
	t(`scheduling.dayTypes.${code}`, {
		count,
		defaultValue: humaniseIdentifier(code),
	});

/**
 * A day type's label as a sentence carries it, lower-cased: "On rest day".
 * A day the API names no type for reads "day off". Pure.
 */
export const dayTypeInSentence = (code: string | null, t: TFunction): string =>
	(code === null
		? t("scheduling.rosterEdit.dayOff")
		: dayTypeLabel(code, t)
	).toLocaleLowerCase();
