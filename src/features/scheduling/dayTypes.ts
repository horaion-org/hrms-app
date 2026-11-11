import type { TFunction } from "i18next";
import { humaniseIdentifier } from "@/features/scheduling/roster/findings/ruleLabel";

/*
 * A day's type ("OFF", "REST", …) is data the API sends, never a list the app
 * keeps: a type added later still reads, by its code made readable, until it
 * gets a translation.
 */

/** A day type in words: its translation, else its code made readable ("PUBLIC_HOLIDAY_OFF" → "Public holiday off"). Pure. */
export const dayTypeLabel = (code: string, t: TFunction): string =>
	t(`scheduling.dayTypes.${code}`, { defaultValue: humaniseIdentifier(code) });
