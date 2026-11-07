import type { FindingCounts } from "@/features/scheduling/roster/findings/findingCounts";
import {
	hoursInDays,
	rosterStats,
	type RosterRow,
	type RosterStats,
} from "@/features/scheduling/roster/roster";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

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
 * What "Issues n" counts, the one definition of that number: every roster
 * note the engine left (each conflict, each error message and each day's
 * message), every setup issue (each diagnostic), and one for starting
 * points that changed since generation, each day whose leave or cover the
 * roster marks, and each day a manager must decide. A note that only qualifies the
 * others ("these notes are from generation") is shown but not counted.
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

/** The Issues count: the sum of `ISSUE_SOURCES`. */
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

/** The days a manager must decide (a shift or the day off), by day and then by name. */
export const daysToDecide = (
	assignments: ReadonlyArray<ScheduleAssignment>
): Array<ScheduleAssignment> =>
	assignments
		.filter((row) => row.member && asksForDecision(flagsOf(row)))
		.sort(
			(first, second) =>
				first.day.localeCompare(second.day) ||
				(first.member?.displayName ?? "").localeCompare(
					second.member?.displayName ?? ""
				)
		);

/** The days the roster marks for leave or a shift left short, by day and then by name. */
export const leaveAndCoverDays = (
	assignments: ReadonlyArray<ScheduleAssignment>
): Array<ScheduleAssignment> =>
	assignments
		.filter((row) => row.member && marksLeaveOrCover(flagsOf(row)))
		.sort(
			(first, second) =>
				first.day.localeCompare(second.day) ||
				(first.member?.displayName ?? "").localeCompare(
					second.member?.displayName ?? ""
				)
		);

/** The days changed by hand since generation, by day and then by name. */
export const changedDays = (
	assignments: ReadonlyArray<ScheduleAssignment>
): Array<ScheduleAssignment> =>
	assignments
		.filter((row) => row.lastChange && row.member)
		.sort(
			(first, second) =>
				first.day.localeCompare(second.day) ||
				(first.member?.displayName ?? "").localeCompare(
					second.member?.displayName ?? ""
				)
		);
