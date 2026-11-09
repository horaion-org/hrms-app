/*
 * A week grid shown one day at a time on a phone: every day column stays
 * in the one grid, and below `md` only the shown day's column is visible.
 * Days are ISO dates ("YYYY-MM-DD"), so they compare as strings.
 */

/**
 * The day shown below `md`: the one asked for when it is one of `days`,
 * else today when it is, else the first. Worked out on every render, like
 * the week, so a page left open past midnight moves on.
 */
export const shownDayOf = (
	days: ReadonlyArray<string>,
	requested: string | undefined,
	today: string
): string | undefined => {
	if (requested !== undefined && days.includes(requested)) return requested;
	return days.includes(today) ? today : days[0];
};

/** The URL's `day`, left out when it is the day shown anyway. */
export const dayParameter = (
	days: ReadonlyArray<string>,
	day: string,
	today: string
): string | undefined =>
	day === shownDayOf(days, undefined, today) ? undefined : day;

/**
 * A day column's classes in a grid shown one day at a time: hidden below
 * `md` unless it is the shown day. None when the grid shows every day.
 * Either both are dates or both are weekdays ("MON").
 */
export const dayColumnClasses = (
	day: string,
	shownDay: string | undefined
): string | undefined =>
	shownDay === undefined || day === shownDay
		? undefined
		: "hidden md:table-cell";
