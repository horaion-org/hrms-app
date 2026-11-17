/*
 * Mirrors the API's NormalDay; the API decides. Hours a day are worked out
 * from the working days and the hours a week, never typed: the week divided
 * by the days, rounded down to the minute, and none when the days vary.
 */

/** The normal day of a week, in whole minutes; null when the days vary or nothing can be worked out. */
export const normalDayMinutes = (
	daysPerWeek: number | null,
	weekMinutes: number | null
): number | null => {
	if (daysPerWeek === null || weekMinutes === null || daysPerWeek <= 0)
		return null;
	return Math.floor(weekMinutes / daysPerWeek);
};
