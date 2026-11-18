import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { daysOf, mondayOf } from "@/common/weeks";
import type {
	DatesPlan,
	DatesPlanWeek,
	DayRun,
	GenerateDatesBody,
} from "@/features/scheduling/dates/api";
import { handChangesReplacedIn } from "@/features/scheduling/dates/handChanges";
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

/** The last day a schedule starting on `firstDay` may reach. */
export const maxLastDayOf = (firstDay: string): string =>
	dayjs(firstDay)
		.add(MAX_DAYS_BY_DATES - 1, "day")
		.format(ISO_DATE_FORMAT);

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

/** A day of a plan week's strip: a month card's day, and whether it already has a schedule that stays. */
export type PlanDay = MonthWeek["days"][number] & { kept: boolean };

/** One week of "What this creates": its asked days, how its seven days look, its lines and its badge. */
export type PlanRow = {
	periodStart: string;
	/** The asked days of this week. */
	asked: { start: string; end: string };
	/** Seven days, Monday first: a day generated (new or scheduled again) looks covered, a day that stays looks kept, any other has no roster. */
	days: Array<PlanDay>;
	/** The week's days the run touches, in day order: consecutive days treated alike make one line. */
	lines: Array<PlanLine>;
	/** The week's separate schedules once generated, in day order, when it will hold more than one; otherwise empty. */
	schedules: Array<DayRun>;
	/** How many of the days the run replaces carry a hand change (`handChangesReplacedIn`). */
	handChangesReplaced: number;
	badge: PlanBadge;
};

/** The day after `date`. */
const dayAfter = (date: string): string =>
	dayjs(date).add(1, "day").format(ISO_DATE_FORMAT);

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

/**
 * The schedules a plan week will hold once generated, in day order, when more
 * than one (API ADR-0129): each part that keeps days, the new days, then the
 * rest of the week as one; empty when it generates nothing or stays one schedule.
 */
export const weekSchedulesOf = (week: DatesPlanWeek): Array<DayRun> => {
	if (week.newFrom === null || week.newTo === null) return [];
	const kept = week.kept.map((part) => ({
		from: part.coveredFrom,
		to: part.coveredTo,
	}));
	const restDays = week.rest
		.flatMap((part) => [part.coveredFrom, part.coveredTo])
		.sort();
	const rest =
		restDays.length === 0
			? []
			: [{ from: restDays[0]!, to: restDays[restDays.length - 1]! }];
	const schedules = [...kept, { from: week.newFrom, to: week.newTo }, ...rest];
	if (schedules.length < 2) return [];
	return schedules.sort((first, second) =>
		first.from.localeCompare(second.from)
	);
};

/** One plan week as a row of "What this creates": generated days look covered, days that stay look kept. */
export const planRowOf = (week: DatesPlanWeek): PlanRow => {
	const days = daysOf(week.periodStart).map((date) => {
		const kind = lineKindOf(week, date);
		return {
			date,
			shortShifts: 0,
			covered: kind !== undefined && kind !== "stays",
			kept: kind === "stays",
		};
	});
	return {
		periodStart: week.periodStart,
		asked: { start: week.askedFrom, end: week.askedTo },
		days,
		lines: planLinesOf(week),
		schedules: weekSchedulesOf(week),
		handChangesReplaced: handChangesReplacedIn(week),
		badge: planBadgeOf(week),
	};
};

/** What the notes under "What this creates" name, across the plan's weeks. */
export type PlanNotes = {
	/** The asked days that have been published (or published and taken back) and stay as they are, a run per part. */
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
	dayjs(date).subtract(1, "day").format(ISO_DATE_FORMAT);

/** The part a roster page shows, by its id, its week's Monday and its days. */
type ShownPart = Pick<WeekPart, "scheduleId" | "coveredFrom" | "coveredTo"> & {
	periodStart: string;
};

/**
 * What holds a run of a week's days outside the shown part: another part
 * (with its schedule id and state), or none, after the part or before it,
 * those before it told apart once they have passed in the branch's time.
 */
export type WeekRun =
	| {
			kind: "otherPart";
			days: DayRun;
			part: Pick<WeekPart, "scheduleId" | "state">;
	  }
	| { kind: "noneAfter" | "noneBefore" | "passedBefore"; days: DayRun };

/** What holds one day outside the shown part, without its days. */
type DayHolder =
	| { kind: "otherPart"; part: WeekPart }
	| { kind: "noneAfter" | "noneBefore" | "passedBefore" };

/**
 * What holds `date`: another part covering it, the one keeping its days
 * first (a redo part only holds days no other part keeps), or none.
 */
const holderOf = (
	date: string,
	shown: ShownPart,
	parts: ReadonlyArray<WeekPart>,
	today: string
): DayHolder => {
	const others = parts.filter(
		(part) =>
			part.scheduleId !== shown.scheduleId &&
			isWithin(date, part.coveredFrom, part.coveredTo)
	);
	const part = others.find((other) => !other.redoing) ?? others[0];
	if (part) return { kind: "otherPart", part };
	if (date > shown.coveredTo) return { kind: "noneAfter" };
	return date < today ? { kind: "passedBefore" } : { kind: "noneBefore" };
};

/** Whether two days' holders are the same: the same kind, and the same part for another part's days. */
const sameHolder = (run: WeekRun, holder: DayHolder): boolean =>
	run.kind === holder.kind &&
	(run.kind !== "otherPart" ||
		(holder.kind === "otherPart" &&
			run.part.scheduleId === holder.part.scheduleId));

/** A run of one day, held by `holder`. */
const runOfDay = (date: string, holder: DayHolder): WeekRun => {
	const days = { from: date, to: date };
	if (holder.kind !== "otherPart") return { kind: holder.kind, days };
	const { scheduleId, state } = holder.part;
	return { kind: "otherPart", days, part: { scheduleId, state } };
};

/**
 * The days of the shown part's week outside it, in day order, as runs of
 * consecutive days with the same holder (`parts`, from the month read;
 * `today`, the branch's today as an ISO date).
 */
export const weekRunsAround = (
	shown: ShownPart,
	parts: ReadonlyArray<WeekPart>,
	today: string
): Array<WeekRun> => {
	const runs: Array<WeekRun> = [];
	for (const date of daysOf(shown.periodStart)) {
		if (isWithin(date, shown.coveredFrom, shown.coveredTo)) continue;
		const holder = holderOf(date, shown, parts, today);
		const last = runs[runs.length - 1];
		if (last && sameHolder(last, holder) && dayAfter(last.days.to) === date)
			last.days.to = date;
		else runs.push(runOfDay(date, holder));
	}
	return runs;
};

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
		dayjs(days.from).add(offset, "day").format(ISO_DATE_FORMAT)
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
