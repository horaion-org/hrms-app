import { MINUTES_PER_DAY, minutesOfDay } from "@/common/timeOfDay";
import { WEEKDAYS, type Weekday } from "@/common/weekdays";

/*
 * A part-time member's work availability: a weekly pattern of windows, each
 * starting on one weekday at a half-hour time. An end at or before the start
 * runs past midnight into the next day, so the week is a circle: Sunday's
 * late window runs into Monday. The rules mirror the API's (ADR-0053).
 * Pure: no React, no requests.
 */

/** A start and an end, each "HH:mm". */
export type TimeWindow = { startTime: string; endTime: string };

/** One window of the pattern, on the weekday it starts. */
export type WeeklyWindow = TimeWindow & { day: Weekday };

/** One day of the pattern and its windows, earliest first. */
export type AvailabilityDay = { day: Weekday; windows: Array<TimeWindow> };

/** A member's pattern as the API answers it: all seven days, Monday first. */
export type WeeklyAvailability = {
	membershipId: string;
	days: Array<AvailabilityDay>;
};

/** What replacing a member's pattern sends: the complete new set. */
export type ReplaceAvailabilityRequest = { windows: Array<WeeklyWindow> };

/**
 * One row of the editor: the same times on any number of days. A time not
 * chosen yet is "".
 */
export type WindowDraft = {
	days: Array<Weekday>;
	startTime: string;
	endTime: string;
};

/** Why one editor row can't be saved; at most one per row. */
export type WindowProblem = {
	row: number;
	kind: "noDays" | "noTimes" | "emptyWindow" | "crowdedDay" | "overlap";
	/** The day a crowded day or an overlap is on. */
	day?: Weekday;
};

/** The most windows that may start on one day. */
const MAX_WINDOWS_PER_DAY = 4;

const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/** Only part-time members have a pattern; it is never shown or asked for anyone else. */
export const isPartTime = (
	employmentType: string | null | undefined
): boolean => employmentType === "PART_TIME";

/** Every window of an API answer, Monday first. */
export const windowsOf = (
	availability: WeeklyAvailability
): Array<WeeklyWindow> =>
	availability.days.flatMap(({ day, windows }) =>
		windows.map((window) => ({ day, ...window }))
	);

const byStart = (a: TimeWindow, b: TimeWindow): number =>
	a.startTime.localeCompare(b.startTime);

/** The seven days, Monday first, each with its windows earliest first; a day without any has none. */
export const byDay = (
	windows: ReadonlyArray<WeeklyWindow>
): Array<AvailabilityDay> =>
	WEEKDAYS.map((day) => ({
		day,
		windows: windows
			.filter((window) => window.day === day)
			.map(({ startTime, endTime }) => ({ startTime, endTime }))
			.sort(byStart),
	}));

/** A window as shown, e.g. "09:00–17:00", or "22:00–06:00" past midnight. */
export const formatWindow = ({ startTime, endTime }: TimeWindow): string =>
	`${startTime}–${endTime}`;

/**
 * The editor's rows for a pattern: windows with the same times share a row,
 * in the order their first day comes in the week, then by start.
 */
export const draftsOf = (
	windows: ReadonlyArray<WeeklyWindow>
): Array<WindowDraft> => {
	const drafts: Array<WindowDraft> = [];
	for (const { day, windows: dayWindows } of byDay(windows))
		for (const { startTime, endTime } of dayWindows) {
			const same = drafts.find(
				(draft) => draft.startTime === startTime && draft.endTime === endTime
			);
			if (same) same.days.push(day);
			else drafts.push({ days: [day], startTime, endTime });
		}
	return drafts;
};

/** One window of the set a row stands for, with the row it came from. */
type RowWindow = { row: number; window: WeeklyWindow };

/**
 * The windows the rows stand for, row by row and each row's days in week
 * order: the order the request sends them in, so the API's `windows[i]`
 * names the i-th of these.
 */
export const expandDrafts = (
	drafts: ReadonlyArray<WindowDraft>
): Array<RowWindow> =>
	drafts.flatMap(({ days, startTime, endTime }, row) =>
		WEEKDAYS.filter((day) => days.includes(day)).map((day) => ({
			row,
			window: { day, startTime, endTime },
		}))
	);

/** The request replacing a member's pattern with the rows'. */
export const toReplaceRequest = (
	drafts: ReadonlyArray<WindowDraft>
): ReplaceAvailabilityRequest => ({
	windows: expandDrafts(drafts).map(({ window }) => window),
});

const minuteOfWeek = ({ day, startTime }: WeeklyWindow): number =>
	WEEKDAYS.indexOf(day) * MINUTES_PER_DAY + minutesOfDay(startTime);

/** How long a window runs; past midnight it continues into the next day. */
const lengthOf = ({ startTime, endTime }: TimeWindow): number =>
	(minutesOfDay(endTime) - minutesOfDay(startTime) + MINUTES_PER_DAY) %
	MINUTES_PER_DAY;

const wrapWeek = (minutes: number): number =>
	((minutes % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;

/** Whether either window starts inside the other, on the week as a circle. */
export const overlaps = (a: WeeklyWindow, b: WeeklyWindow): boolean =>
	wrapWeek(minuteOfWeek(b) - minuteOfWeek(a)) < lengthOf(a) ||
	wrapWeek(minuteOfWeek(a) - minuteOfWeek(b)) < lengthOf(b);

/** A row's own problem, before it is compared with any other. */
const rowProblem = (draft: WindowDraft): WindowProblem["kind"] | undefined => {
	if (draft.days.length === 0) return "noDays";
	if (!draft.startTime || !draft.endTime) return "noTimes";
	if (draft.startTime === draft.endTime) return "emptyWindow";
	return undefined;
};

/**
 * Why the rows can't be saved, at most one problem per row, in row order:
 * each row needs a day and two different times; at most four windows may
 * start on one day; and no two windows may overlap, a window past midnight
 * meeting the next day's and Sunday's meeting Monday's. Times are on the
 * half hour already, as the editor offers no other.
 */
export const validateWindows = (
	drafts: ReadonlyArray<WindowDraft>
): Array<WindowProblem> => {
	const problems = new Map<number, WindowProblem>();
	drafts.forEach((draft, row) => {
		const kind = rowProblem(draft);
		if (kind) problems.set(row, { row, kind });
	});
	const comparable = expandDrafts(drafts).filter(
		({ row }) => !problems.has(row)
	);
	const countByDay = new Map<Weekday, number>();
	comparable.forEach(({ row, window }, index) => {
		const count = (countByDay.get(window.day) ?? 0) + 1;
		countByDay.set(window.day, count);
		if (count > MAX_WINDOWS_PER_DAY && !problems.has(row))
			problems.set(row, { row, kind: "crowdedDay", day: window.day });
		const earlier = comparable
			.slice(0, index)
			.some((other) => overlaps(other.window, window));
		if (earlier && !problems.has(row))
			problems.set(row, { row, kind: "overlap", day: window.day });
	});
	return [...problems.values()].sort((a, b) => a.row - b.row);
};
