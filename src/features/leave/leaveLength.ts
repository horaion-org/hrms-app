import type { TFunction } from "i18next";
import { MINUTES_PER_DAY, minutesOfDay } from "@/common/timeOfDay";

/*
 * How long a part of a day off is (the API's ADR-0077: a duration, or a
 * person's own times, counts as the minutes between its times). An end
 * before the start runs past midnight.
 */

const MINUTES_PER_HOUR = 60;

/**
 * The minutes from one "HH:mm" to another, past midnight included
 * ("22:00"–"02:00" is 240). Equal times are 0: the API refuses them.
 */
export const minutesBetween = (startTime: string, endTime: string): number =>
	(minutesOfDay(endTime) - minutesOfDay(startTime) + MINUTES_PER_DAY) %
	MINUTES_PER_DAY;

/** A length as people read it: "4 h", "2 h 30 min", "45 min". */
export const durationText = (minutes: number, t: TFunction): string => {
	const hours = Math.floor(minutes / MINUTES_PER_HOUR);
	const rest = minutes % MINUTES_PER_HOUR;
	if (hours === 0) return t("leave.length.minutes", { minutes: rest });
	if (rest === 0) return t("leave.length.hours", { hours });
	return t("leave.length.hoursAndMinutes", { hours, minutes: rest });
};
