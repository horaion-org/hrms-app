import type { TFunction } from "i18next";
import { hoursFromMinutes } from "@/features/scheduling/shifts/shiftHours";

/*
 * The hours a shift stretched into overtime adds (the API's ADR-0110), in the
 * one wording every place uses: "+2 h", "+1.5 h". Pure.
 */

/** A stretch's hours as a tile marks them beside the shift's time: "+2 h"; nothing without a stretch. */
export const stretchHoursMark = (
	minutes: number | undefined,
	t: TFunction
): string | undefined =>
	minutes
		? t("scheduling.rosterMarkers.stretchHours", {
				hours: hoursFromMinutes(minutes),
			})
		: undefined;

/** A stretch's hours in words: "+2 h overtime", "+1.5 h overtime". */
export const stretchOvertimeText = (minutes: number, t: TFunction): string =>
	t("scheduling.rosterMarkers.stretchOvertime", {
		hours: hoursFromMinutes(minutes),
	});
