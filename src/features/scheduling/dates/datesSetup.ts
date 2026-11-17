import dayjs from "dayjs";
import { daysOf, mondayOf } from "@/common/weeks";
import type {
	DatesPlan,
	DatesPlanWeek,
	DayRun,
	GenerateDatesBody,
} from "@/features/scheduling/dates/api";
import type { MonthWeek, WeekPart } from "@/features/scheduling/months/api";
import type { MonthChoices } from "@/features/scheduling/months/monthGeneration";
import { hasRoster } from "@/features/scheduling/months/weekStateLooks";
import type { PreviousWeek } from "@/features/scheduling/startingContext/startingGrid";
import type { WeekChoiceIds } from "@/features/scheduling/weekChoice";

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

/**
 * What generating does with a run of a week's days (API ADR-0129): they stay
 * as they are, are new with the run's choices, already have a schedule and are
 * scheduled again with the run's choices, or are scheduled again with the
 * week's own shifts and rules.
 */
export type PlanLineKind = "stays" | "new" | "redone" | "weeksOwn";

/** One line of a week in "What this creates": a run of its days and what generating does with them. */
export type PlanLine = { kind: PlanLineKind; days: DayRun };

/** A week's badge: new days only, days already scheduled redone, or nothing generated. */
export type PlanBadge = "new" | "redo" | "kept";

/** One week of "What this creates": its asked days, how its seven days look, its lines and its badge. */
export type PlanRow = {
	periodStart: string;
	/** The asked days of this week. */
	asked: { start: string; end: string };
	/** Seven days, Monday first: a day generated (new or scheduled again) looks covered, any other has no roster. */
	days: MonthWeek["days"];
	/** The week's days the run touches, in day order: consecutive days treated alike make one line. */
	lines: Array<PlanLine>;
	badge: PlanBadge;
};

/** The day after `date`. */
const dayAfter = (date: string): string =>
	dayjs(date).add(1, "day").format(iso);

/** A schedule's days and state: a month read's part, or a dates plan's kept part. */
type PartDays = Pick<WeekPart, "coveredFrom" | "coveredTo" | "state">;

/** Whether `date` lies in the run of days from `from` to `to`. */
const isWithin = (
	date: string,
	from: string | null,
	to: string | null
): boolean => from !== null && to !== null && date >= from && date <= to;

/** Whether any of `parts` covers `date`. */
const coversDate = (parts: ReadonlyArray<PartDays>, date: string): boolean =>
	parts.some((part) => isWithin(date, part.coveredFrom, part.coveredTo));

/** What generating does with one day of a plan week, or undefined when it leaves the day out. */
const lineKindOf = (
	week: DatesPlanWeek,
	date: string
): PlanLineKind | undefined => {
	if (coversDate(week.kept, date)) return "stays";
	if (isWithin(date, week.newFrom, week.newTo))
		return coversDate(week.redone, date) ? "redone" : "new";
	if (coversDate(week.rest, date)) return "weeksOwn";
	return undefined;
};

/** A plan week's days as lines, in day order: consecutive days of one kind make one line. */
const planLinesOf = (week: DatesPlanWeek): Array<PlanLine> => {
	const lines: Array<PlanLine> = [];
	for (const date of daysOf(week.periodStart)) {
		const kind = lineKindOf(week, date);
		if (kind === undefined) continue;
		const last = lines[lines.length - 1];
		if (last && last.kind === kind && dayAfter(last.days.to) === date)
			last.days.to = date;
		else lines.push({ kind, days: { from: date, to: date } });
	}
	return lines;
};

/** The badge of a plan week: Redo when it schedules again days that have a schedule. */
const planBadgeOf = (week: DatesPlanWeek): PlanBadge => {
	if (week.redone.length > 0 || week.rest.length > 0) return "redo";
	return week.newFrom === null ? "kept" : "new";
};

/** One plan week as a row of "What this creates" (no fourth "kept" look: kept days have no roster mark). */
export const planRowOf = (week: DatesPlanWeek): PlanRow => {
	const days = daysOf(week.periodStart).map((date) => {
		const kind = lineKindOf(week, date);
		return {
			date,
			shortShifts: 0,
			covered: kind !== undefined && kind !== "stays",
		};
	});
	return {
		periodStart: week.periodStart,
		asked: { start: week.askedFrom, end: week.askedTo },
		days,
		lines: planLinesOf(week),
		badge: planBadgeOf(week),
	};
};

/** What the notes under "What this creates" name, across the plan's weeks. */
export type PlanNotes = {
	/** The asked days that are published and stay as they are, a run per part. */
	publishedDays: Array<DayRun>;
	/** The asked days with a schedule that generating redoes, a run per part. */
	redoneDays: Array<DayRun>;
	/**
	 * The rest days of the weeks that redo no asked day (new days before a
	 * later part): scheduled again once the new days are ready, a run per part.
	 */
	restOnlyDays: Array<DayRun>;
	/** How many days after the new days are scheduled again with their week's own shifts and rules. */
	restDayCount: number;
};

/** A part's days as a run. */
const runOf = (part: PartDays): DayRun => ({
	from: part.coveredFrom,
	to: part.coveredTo,
});

/** A part's days from `from` to `to`, or none when it has no day there. */
const partDaysWithin = (
	part: PartDays,
	from: string,
	to: string
): Array<DayRun> => {
	const first = part.coveredFrom > from ? part.coveredFrom : from;
	const last = part.coveredTo < to ? part.coveredTo : to;
	return first <= last ? [{ from: first, to: last }] : [];
};

/** How many days the runs hold together. */
export const dayCountOfRuns = (runs: ReadonlyArray<DayRun>): number =>
	runs.reduce((total, run) => total + dayCountOf(run.from, run.to), 0);

/**
 * The notes under "What this creates". A week's kept days among its asked
 * days are published: its new days start at the first asked day that is not
 * (API ADR-0129).
 */
export const planNotesOf = (plan: DatesPlan): PlanNotes => ({
	publishedDays: plan.weeks.flatMap((week) =>
		week.kept.flatMap((part) =>
			partDaysWithin(part, week.askedFrom, week.askedTo)
		)
	),
	redoneDays: plan.weeks.flatMap((week) => week.redone.map(runOf)),
	restOnlyDays: plan.weeks.flatMap((week) =>
		week.redone.length > 0 ? [] : week.rest.map(runOf)
	),
	restDayCount: dayCountOfRuns(
		plan.weeks.flatMap((week) => week.rest.map(runOf))
	),
});

/** A named schedule's days across touching parts of the weeks shown. */
export type NamedSpan = { name: string; from: string; to: string };

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
	// A redo part lies inside a wider part, which still holds the days after it until the redo's roster is ready.
	afterTaken: parts.some((part) => part.coveredTo > schedule.coveredTo),
});

/** What a part's page says of a redo part in its week (API ADR-0129): this part is one, or one redoes its days. */
export type PartRedo = { kind: "redoing" | "beingRedone"; days: DayRun };

/**
 * Whether a redo part touches this part (`parts`, from the month read): this
 * part is a redo part, with its days, or else a redo part of the week
 * overlaps it, with that part's days; none otherwise.
 */
export const partRedoOf = (
	schedule: Pick<WeekPart, "scheduleId" | "coveredFrom" | "coveredTo">,
	parts: ReadonlyArray<WeekPart>
): PartRedo | undefined => {
	const own = parts.find((part) => part.scheduleId === schedule.scheduleId);
	if (own?.redoing) return { kind: "redoing", days: runOf(own) };
	const redo = parts.find(
		(part) =>
			part.redoing &&
			part.coveredFrom <= schedule.coveredTo &&
			part.coveredTo >= schedule.coveredFrom
	);
	return redo && { kind: "beingRedone", days: runOf(redo) };
};

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

/**
 * The part with a roster that covers the day before a run's first generated
 * day, among `parts` (the month reads' parts, a dates plan's kept parts);
 * none when no roster covers it, and "Before this week" asks about the days
 * before.
 */
export const rosterPartBefore = (
	firstDay: string,
	parts: ReadonlyArray<PartDays>
): PartDays | undefined => {
	const day = dayBefore(firstDay);
	return parts.find(
		(part) =>
			hasRoster(part.state) && part.coveredFrom <= day && part.coveredTo >= day
	);
};

/**
 * What "Before this week" says of the days before a run's first generated
 * day: carried over from the roster part that covers the day before (a whole
 * week by its Monday, a shorter part by its days), or none.
 */
export const previousBefore = (
	firstDay: string,
	parts: ReadonlyArray<PartDays>
): PreviousWeek => {
	const part = rosterPartBefore(firstDay, parts);
	if (part === undefined) return { kind: "none" };
	const carried = {
		kind: "carried",
		periodStart: mondayOf(part.coveredFrom),
		uncovered: 0,
	} as const;
	return dayCountOf(part.coveredFrom, part.coveredTo) === 7
		? carried
		: { ...carried, days: { from: part.coveredFrom, to: part.coveredTo } };
};

/** Every date of a run of days, in order. */
export const datesIn = (days: DayRun): Array<string> =>
	Array.from({ length: dayCountOf(days.from, days.to) }, (_, offset) =>
		dayjs(days.from).add(offset, "day").format(iso)
	);

/** The Setup fields a dates run sends: its days, the name it may give, and whether leave counts. */
export type DatesRunSetup = {
	firstDay: string;
	lastDay: string;
	/** Blank leaves the name out: each created week is named as the month run names its weeks. */
	name: string;
	includeLeave: boolean;
};

/**
 * What generating the dates sends: Setup's days, its name when one is given,
 * and a choice for every week the plan creates, the week's own or else
 * `everything`, in the plan's order.
 */
export const datesGenerationBody = (
	setup: DatesRunSetup,
	plan: Pick<DatesPlan, "weeks">,
	choices: MonthChoices,
	everything: WeekChoiceIds
): GenerateDatesBody => ({
	firstDay: setup.firstDay,
	lastDay: setup.lastDay,
	...(setup.name.trim() === "" ? {} : { name: setup.name.trim() }),
	includeLeave: setup.includeLeave,
	newWeeks: plan.weeks
		.filter((week) => week.action === "CREATE_AND_GENERATE")
		.map((week) => {
			const weekChoice = choices[week.periodStart] ?? everything;
			return {
				periodStart: week.periodStart,
				includedShiftIds: weekChoice.shiftIds,
				includedConstraintIds: weekChoice.constraintIds,
			};
		}),
});
