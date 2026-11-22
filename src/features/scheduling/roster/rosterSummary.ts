import type { TFunction } from "i18next";
import type { FindingCounts } from "@/features/scheduling/roster/findings/findingCounts";
import {
	hoursInDays,
	rosterStats,
	type RosterRow,
	type RosterStats,
} from "@/features/scheduling/roster/roster";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { AssignmentList } from "@/features/scheduling/schedules/useScheduleAssignments";

/** What the summary line reads: the roster's counts and its hours. */
export type RosterFigures = RosterStats & { hours: number };

/** The values one summary segment's copy reads: `count` picks the plural, the rest are filled in. */
export type SegmentValues = { count?: number; total?: number; hours?: number };

/** One segment of the summary line, named by its copy under `scheduling.detail.summary`. */
export type SummarySegment = {
	key: "people" | "peopleOf" | "shifts" | "daysOff" | "onLeave" | "hours";
	values: SegmentValues;
};

type SegmentDefinition = {
	key: SummarySegment["key"];
	/** Left out when this says no; shown always without it. */
	shownWhen?: (figures: RosterFigures) => boolean;
	values: (figures: RosterFigures) => SegmentValues;
};

const everyoneRostered = (figures: RosterFigures): boolean =>
	figures.staffRostered === figures.staffTotal;

/**
 * The summary line, in order: "8 people · 42 shifts · 12 days off · 2 days
 * on leave · 278 h". A later figure is one more entry here and its copy.
 */
export const SUMMARY_SEGMENTS: ReadonlyArray<SegmentDefinition> = [
	{
		key: "people",
		shownWhen: everyoneRostered,
		values: ({ staffTotal }) => ({ count: staffTotal }),
	},
	{
		key: "peopleOf",
		shownWhen: (figures) => !everyoneRostered(figures),
		values: ({ staffRostered, staffTotal }) => ({
			count: staffRostered,
			total: staffTotal,
		}),
	},
	{ key: "shifts", values: ({ shifts }) => ({ count: shifts }) },
	{ key: "daysOff", values: ({ daysOff }) => ({ count: daysOff }) },
	{
		key: "onLeave",
		shownWhen: ({ onLeave }) => onLeave > 0,
		values: ({ onLeave }) => ({ count: onLeave }),
	},
	{ key: "hours", values: ({ hours }) => ({ hours }) },
];

/** Every day of every row added up: the counts `rosterStats` gives, and the hours. */
export const rosterFigures = (
	rows: ReadonlyArray<RosterRow>
): RosterFigures => ({
	...rosterStats(rows),
	hours: rows.reduce(
		(total, row) => total + hoursInDays(row, Object.keys(row.days)),
		0
	),
});

/** The summary line's segments for these rows, each with its values. */
export const rosterSummarySegments = (
	rows: ReadonlyArray<RosterRow>
): Array<SummarySegment> => {
	const figures = rosterFigures(rows);
	return SUMMARY_SEGMENTS.filter(
		({ shownWhen }) => shownWhen?.(figures) ?? true
	).map(({ key, values }) => ({ key, values: values(figures) }));
};

/** Hours in the summary line keep one decimal at most: "37.5 h". */
const HOURS_FRACTION_DIGITS = 1;

/** The summary line above the grid, its segments joined: "3 people · 15 shifts · … · 94 h". */
export const rosterSummaryLine = (
	rows: ReadonlyArray<RosterRow>,
	t: TFunction,
	language: string
): string => {
	const numbers = new Intl.NumberFormat(language, {
		maximumFractionDigits: HOURS_FRACTION_DIGITS,
	});
	return rosterSummarySegments(rows)
		.map(({ key, values: { count, total, hours } }) =>
			t(`scheduling.detail.summary.${key}`, {
				count,
				total,
				hours: hours === undefined ? undefined : numbers.format(hours),
			})
		)
		.join(" · ");
};

/** What the Issues count reads. */
export type IssueFacts = {
	/** What the engine left; null when the run has no findings. */
	findings: FindingCounts | null;
	/** Members whose week before changed since generation. */
	membersWithChangedStart: number;
	/** Days whose leave or cover the roster marks (`leaveAndCoverDays`). */
	leaveAndCoverDays: number;
	/** Days a manager must decide (`daysToDecide`). */
	daysToDecide: number;
};

type IssueSource = {
	key:
		| "rosterNotes"
		| "setupIssues"
		| "changedStarts"
		| "leaveAndCover"
		| "daysToDecide";
	count: (facts: IssueFacts) => number;
};

/**
 * Whether Issues has anything to list, so its week bar button shows: every
 * roster note the engine left (each conflict, each error message and each
 * day's message), every setup issue (each diagnostic), and one for starting
 * points that changed since generation, each day whose leave or cover the
 * roster marks, and each day a manager must decide. The number on the
 * button is not this sum but the Must fix count (`issueCounts`), with the
 * Could not be met count beside it.
 */
export const ISSUE_SOURCES: ReadonlyArray<IssueSource> = [
	{ key: "rosterNotes", count: ({ findings }) => findings?.roster ?? 0 },
	{ key: "setupIssues", count: ({ findings }) => findings?.setup ?? 0 },
	{
		key: "changedStarts",
		count: ({ membersWithChangedStart }) =>
			membersWithChangedStart > 0 ? 1 : 0,
	},
	{
		key: "leaveAndCover",
		count: ({ leaveAndCoverDays }) => leaveAndCoverDays,
	},
	{ key: "daysToDecide", count: ({ daysToDecide }) => daysToDecide },
];

/** How much Issues has to list: the sum of `ISSUE_SOURCES`; above zero, its button shows. */
export const issueCount = (facts: IssueFacts): number =>
	ISSUE_SOURCES.reduce((total, source) => total + source.count(facts), 0);

/** The flags that ask a manager to decide the day, listed apart from leave and cover. */
const DECISION_FLAGS: ReadonlySet<ScheduleAssignment["flag"]> = new Set<
	ScheduleAssignment["flag"]
>(["NEEDS_DECISION", "NEEDS_ATTENTION"]);

/** What a day's flag and short shift say, wherever the roster reads them. */
export type DayFlags = {
	flag?: ScheduleAssignment["flag"];
	/** Whether the day's absence leaves a shift short. */
	leavesShiftShort: boolean;
};

/** Whether the day asks a manager to decide it. */
export const asksForDecision = ({ flag }: DayFlags): boolean =>
	DECISION_FLAGS.has(flag);

/** Whether the day is marked for leave (requested, or taken while rostered) or for a shift left short. */
export const marksLeaveOrCover = ({
	flag,
	leavesShiftShort,
}: DayFlags): boolean =>
	Boolean(flag && flag !== "UNKNOWN" && !DECISION_FLAGS.has(flag)) ||
	leavesShiftShort;

const flagsOf = (row: ScheduleAssignment): DayFlags => ({
	flag: row.flag,
	leavesShiftShort: Boolean(row.uncoveredShift),
});

/** Orders roster rows by day, then by the member's name; a row with no member sorts first within its day. */
export const byDayThenName = (
	first: ScheduleAssignment,
	second: ScheduleAssignment
): number =>
	first.day.localeCompare(second.day) ||
	(first.member?.displayName ?? "").localeCompare(
		second.member?.displayName ?? ""
	);

/** The days a manager must decide (a shift or the day off), by day and then by name. */
export const daysToDecide = (
	assignments: ReadonlyArray<ScheduleAssignment>
): Array<ScheduleAssignment> =>
	assignments
		.filter((row) => row.member && asksForDecision(flagsOf(row)))
		.sort(byDayThenName);

/** The days the roster marks for leave or a shift left short, by day and then by name. */
export const leaveAndCoverDays = (
	assignments: ReadonlyArray<ScheduleAssignment>
): Array<ScheduleAssignment> =>
	assignments
		.filter((row) => row.member && marksLeaveOrCover(flagsOf(row)))
		.sort(byDayThenName);

/** The days changed by hand since generation, by day and then by name. */
export const changedDays = (
	assignments: ReadonlyArray<ScheduleAssignment>
): Array<ScheduleAssignment> =>
	assignments.filter((row) => row.lastChange && row.member).sort(byDayThenName);

/** Whether the roster, once read, has any day changed by hand since generation. */
export const hasHandChanges = (assignments: AssignmentList): boolean =>
	assignments.status === "ready" && changedDays(assignments.items).length > 0;
