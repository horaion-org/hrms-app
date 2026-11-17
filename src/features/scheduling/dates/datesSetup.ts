import dayjs from "dayjs";
import { daysOf } from "@/common/weeks";
import type { DatesPlanWeek, DayRun } from "@/features/scheduling/dates/api";
import type {
	MonthWeek,
	WeekPart,
	WeekState,
} from "@/features/scheduling/months/api";

/*
 * What Setup shows for a schedule by dates, pure. Dates are ISO strings
 * ("YYYY-MM-DD"), `today` included: the branch's today. The API plans the
 * dates and stays the authority; these helpers only check the form first and
 * lay the plan out.
 */

/** The most days one schedule by dates covers (API ADR-0114). */
export const MAX_DAYS_BY_DATES = 31;

const iso = "YYYY-MM-DD";

/** The last day a schedule starting on `firstDay` may reach. */
export const maxLastDayOf = (firstDay: string): string =>
	dayjs(firstDay)
		.add(MAX_DAYS_BY_DATES - 1, "day")
		.format(iso);

/** How many days from `firstDay` to `lastDay`, both included. */
export const dayCountOf = (firstDay: string, lastDay: string): number =>
	dayjs(lastDay).diff(dayjs(firstDay), "day") + 1;

/** What is wrong with the chosen days, as the API checks them. */
export type DatesProblem = "missing" | "past" | "reversed" | "tooLong";

/** Why the chosen days can't be planned yet, or undefined when they can. */
export const datesProblemOf = (
	firstDay: string,
	lastDay: string,
	today: string
): DatesProblem | undefined => {
	if (firstDay === "" || lastDay === "") return "missing";
	if (firstDay < today) return "past";
	if (lastDay < firstDay) return "reversed";
	if (dayCountOf(firstDay, lastDay) > MAX_DAYS_BY_DATES) return "tooLong";
	return undefined;
};

/** One week of "What this creates": its asked days, how its seven days look, and its badge. */
export type PlanRow = {
	periodStart: string;
	/** The asked days of this week. */
	asked: { start: string; end: string };
	/** Seven days, Monday first: a new day looks covered, any other has no roster. */
	days: MonthWeek["days"];
	badge: "new" | "kept";
	/** How many of the week's days are new; 7 is the whole week. */
	newDayCount: number;
	/** The state of the schedule kept on the asked days, for a week with nothing new. */
	keptState: WeekState | undefined;
};

/** Whether `date` lies in the run of days from `from` to `to`. */
const isWithin = (
	date: string,
	from: string | null,
	to: string | null
): boolean => from !== null && to !== null && date >= from && date <= to;

/** One plan week as a row of "What this creates" (no fourth "kept" look: kept days have no roster mark). */
export const planRowOf = (week: DatesPlanWeek): PlanRow => {
	const days = daysOf(week.periodStart).map((date) => ({
		date,
		shortShifts: 0,
		covered: isWithin(date, week.newFrom, week.newTo),
	}));
	const newDayCount = days.filter((day) => day.covered).length;
	return {
		periodStart: week.periodStart,
		asked: { start: week.askedFrom, end: week.askedTo },
		days,
		badge: newDayCount > 0 ? "new" : "kept",
		newDayCount,
		keptState: newDayCount > 0 ? undefined : week.kept[0]?.state,
	};
};

/** A named schedule's days across touching parts of the weeks shown. */
export type NamedSpan = { name: string; from: string; to: string };

/** The day after `date`. */
const dayAfter = (date: string): string =>
	dayjs(date).add(1, "day").format(iso);

/**
 * The named schedules among `parts`, in day order: touching parts with a name
 * the manager gave (`named`, decided by the API) and the same name join into
 * one span. The app never compares a name with the default week name.
 */
export const namedSpansOf = (
	parts: ReadonlyArray<WeekPart>
): Array<NamedSpan> => {
	const spans: Array<NamedSpan> = [];
	for (const part of parts) {
		if (!part.named) continue;
		const last = spans[spans.length - 1];
		if (
			last &&
			last.name === part.name &&
			dayAfter(last.to) === part.coveredFrom
		)
			last.to = part.coveredTo;
		else
			spans.push({
				name: part.name,
				from: part.coveredFrom,
				to: part.coveredTo,
			});
	}
	return spans;
};

/** The day before `date`. */
const dayBefore = (date: string): string =>
	dayjs(date).subtract(1, "day").format(iso);

/** A part of a week, by its days. */
type CoveredWeek = {
	periodStart: string;
	periodEnd: string;
	coveredFrom: string;
	coveredTo: string;
};

/** The days of a part's week around it: before it (another part's), and after it, still free or another part's. */
export type DaysAroundPart = {
	/** The week's days before this part, which another part holds. */
	before: DayRun | undefined;
	/** The week's days after this part. */
	after: DayRun | undefined;
	/** Whether a later part already holds the days after. */
	afterTaken: boolean;
};

/**
 * What a part says of its week's other days: the days before it, and the
 * days after it, which "Schedule the remaining days" offers while no later
 * part of the week (`parts`, from the month read) holds them.
 */
export const daysAroundPart = (
	schedule: CoveredWeek,
	parts: ReadonlyArray<WeekPart>
): DaysAroundPart => ({
	before:
		schedule.coveredFrom > schedule.periodStart
			? { from: schedule.periodStart, to: dayBefore(schedule.coveredFrom) }
			: undefined,
	after:
		schedule.coveredTo < schedule.periodEnd
			? { from: dayAfter(schedule.coveredTo), to: schedule.periodEnd }
			: undefined,
	afterTaken: parts.some((part) => part.coveredFrom > schedule.coveredTo),
});

/**
 * The days of a part's week before its first generated day: Monday to the
 * day before `firstDay`; none when it starts on the Monday. A started week
 * generated from today (Month) or dates from mid-week ask about these days.
 */
export const daysBeforeOf = (
	monday: string,
	firstDay: string
): DayRun | undefined =>
	firstDay > monday ? { from: monday, to: dayBefore(firstDay) } : undefined;

/** Every date of a run of days, in order. */
export const datesIn = (days: DayRun): Array<string> =>
	Array.from({ length: dayCountOf(days.from, days.to) }, (_, offset) =>
		dayjs(days.from).add(offset, "day").format(iso)
	);
