import {
	strongestTone,
	type Finding,
} from "@/features/scheduling/roster/findings/finding";
import {
	cellKey,
	type GridFindings,
} from "@/features/scheduling/roster/findings/findingsOnGrid";
import type {
	RosterDayNote,
	RosterRow,
} from "@/features/scheduling/roster/roster";
import {
	asksForDecision,
	marksLeaveOrCover,
} from "@/features/scheduling/roster/rosterSummary";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * What the roster grid marks, decided without rendering: the one mark a
 * cell carries, the counts its row and day headers show, the tile's lines,
 * and what the Issues panel lists when opened from one header.
 */

/** The one mark a cell may carry: it needs a look, or it was changed by hand. */
export type CellMark = "issue" | "changed";

/** What a cell's mark is decided from. */
export type CellFacts = {
	/** Findings and day notes on the cell. */
	issues: number;
	/** Changed by hand since generation. */
	changed: boolean;
	/** False on a member's own roster, which marks no issues (only changes). */
	showsIssues: boolean;
};

/**
 * The marks in priority order: a cell shows the first that applies, and
 * nothing when none does. A cell to look at wins over a changed one.
 */
export const CELL_MARKS: ReadonlyArray<{
	mark: CellMark;
	shownWhen: (facts: CellFacts) => boolean;
}> = [
	{
		mark: "issue",
		shownWhen: ({ issues, showsIssues }) => showsIssues && issues > 0,
	},
	{ mark: "changed", shownWhen: ({ changed }) => changed },
];

/** Each mark's hover text, by its copy key; what it means is said in the tile's label too. */
export const CELL_MARK_TITLE_KEYS: Record<
	CellMark,
	"scheduling.rosterMarkers.needsALook" | "scheduling.rosterEdit.editedCell"
> = {
	issue: "scheduling.rosterMarkers.needsALook",
	changed: "scheduling.rosterEdit.editedCell",
};

/** The cell's one mark, or none. */
export const cellMark = (facts: CellFacts): CellMark | undefined =>
	CELL_MARKS.find(({ shownWhen }) => shownWhen(facts))?.mark;

/** The flags a member's own tile reads in words, by their copy under `scheduling.rosterMarkers`. */
export const LEAVE_MARKER_KEYS: Partial<
	Record<NonNullable<ScheduleAssignment["flag"]>, "leaveRequested" | "onLeave">
> = {
	LEAVE_REQUESTED: "leaveRequested",
	ON_LEAVE_WHILE_ROSTERED: "onLeave",
};

/**
 * How many issues a day's note adds, as the Issues count adds them: one for
 * a day to decide, and one for leave or a shift left short.
 */
export const dayNoteIssues = (note: RosterDayNote | undefined): number => {
	if (!note) return 0;
	const flags = {
		flag: note.flag,
		leavesShiftShort: note.uncoveredShiftName !== undefined,
	};
	return (asksForDecision(flags) ? 1 : 0) + (marksLeaveOrCover(flags) ? 1 : 0);
};

/** One line a chosen day's panel reads for its note, each with its copy under `scheduling.rosterMarkers`. */
export type DayNoteLine =
	| { kind: "decision"; key: "needsDecision" | "needsAttention" }
	| {
			kind: "leave";
			key: "leaveRequested" | "onLeave";
			leaveTypeName?: string;
			leaveRequestId?: string;
	  }
	| { kind: "cover"; shiftName: string };

/** What the day editor already says in its own words, so its panel leaves that line out. */
export type SaidApart = ReadonlySet<"decision" | "leaveRequested">;

const NOTHING_SAID_APART: SaidApart = new Set();

/**
 * What the day editor (`RosterCellPanel`) says in its own words: a day to
 * decide always, and requested leave too when it may change leave. A
 * read-only panel says neither.
 */
export const saidApartBy = (
	editor: { changesLeave: boolean } | undefined
): SaidApart =>
	editor === undefined
		? NOTHING_SAID_APART
		: new Set(
				editor.changesLeave ? ["decision", "leaveRequested"] : ["decision"]
			);

/**
 * A day note's lines, in order: a day to decide, then leave, then a shift
 * left short. A line `saidApart` names is left out.
 */
export const dayNoteLines = (
	note: RosterDayNote | undefined,
	saidApart: SaidApart = NOTHING_SAID_APART
): Array<DayNoteLine> => {
	if (!note) return [];
	const leaveKey = note.flag ? LEAVE_MARKER_KEYS[note.flag] : undefined;
	const decision = asksForDecision({
		flag: note.flag,
		leavesShiftShort: false,
	});
	return [
		...(decision && !saidApart.has("decision")
			? [
					{
						kind: "decision" as const,
						key:
							note.flag === "NEEDS_ATTENTION"
								? ("needsAttention" as const)
								: ("needsDecision" as const),
					},
				]
			: []),
		...(leaveKey &&
		!(leaveKey === "leaveRequested" && saidApart.has("leaveRequested"))
			? [
					{
						kind: "leave" as const,
						key: leaveKey,
						...(note.leaveTypeName
							? { leaveTypeName: note.leaveTypeName }
							: {}),
						...(note.leaveRequestId
							? { leaveRequestId: note.leaveRequestId }
							: {}),
					},
				]
			: []),
		...(note.uncoveredShiftName === undefined
			? []
			: [{ kind: "cover" as const, shiftName: note.uncoveredShiftName }]),
	];
};

const NO_FINDINGS: ReadonlyArray<Finding> = [];

/** The findings placed on a member's day; none for a member who no longer resolves. */
export const cellFindings = (
	placed: GridFindings | undefined,
	row: Pick<RosterRow, "membershipId">,
	date: string
): ReadonlyArray<Finding> =>
	(row.membershipId !== null &&
		placed?.byCell.get(cellKey(row.membershipId, date))) ||
	NO_FINDINGS;

/** A member's day: its findings and what its note adds. */
export const cellIssues = (
	placed: GridFindings | undefined,
	row: Pick<RosterRow, "membershipId" | "days">,
	date: string
): number =>
	cellFindings(placed, row, date).length + dayNoteIssues(row.days[date]?.note);

/** How a header count reads: a triangle for anything to look at, the info circle for information only. */
export type IssueTone = "attention" | "info";

/** What one row or day header shows: how many, and in which tone; none at 0. */
export type HeaderCount = { count: number; tone: IssueTone };

const headerCount = (
	findings: ReadonlyArray<Finding>,
	noteIssues: number
): HeaderCount | undefined => {
	const count = findings.length + noteIssues;
	if (count === 0) return undefined;
	const tone =
		noteIssues === 0 && strongestTone(findings) === "info"
			? "info"
			: "attention";
	return { count, tone };
};

/**
 * A row header's count: what the engine left about the member, plus every
 * issue on their days in view, so each dot in the row is counted in it.
 */
export const rowIssueCount = (
	placed: GridFindings | undefined,
	row: Pick<RosterRow, "membershipId" | "days">,
	days: ReadonlyArray<string>
): HeaderCount | undefined => {
	if (row.membershipId === null) return undefined;
	return headerCount(
		[
			...(placed?.byRow.get(row.membershipId) ?? NO_FINDINGS),
			...days.flatMap((date) => cellFindings(placed, row, date)),
		],
		days.reduce((total, date) => total + dayNoteIssues(row.days[date]?.note), 0)
	);
};

/** A day header's count: what the engine left about the day as a whole (no member's cell). */
export const dayIssueCount = (
	placed: GridFindings | undefined,
	date: string
): HeaderCount | undefined =>
	headerCount(placed?.byDate.get(date) ?? NO_FINDINGS, 0);

/** Whether a tile shows its role line: not when empty or when it repeats the member's job title in the row header. */
export const showsRole = (role: string, jobTitle: string | null): boolean =>
	role !== "" && role !== jobTitle;

/**
 * The words a member's own tile adds for their leave ("Leave requested"),
 * as their roster marks no issues; none on a manager's roster, where the
 * cell's dot and its panel say it.
 */
export const tileStatusKey = (
	note: RosterDayNote | undefined,
	showsIssues: boolean
): "leaveRequested" | "onLeave" | undefined =>
	showsIssues || !note?.flag ? undefined : LEAVE_MARKER_KEYS[note.flag];

/** Which header opened the Issues panel: one member's row, or one day. */
export type IssuesAbout =
	{ kind: "member"; membershipId: string } | { kind: "date"; date: string };

/** What the Issues panel lists for one header: exactly what that header counted. */
export type IssuesOfHeader = {
	findings: Array<Finding>;
	daysToDecide: Array<ScheduleAssignment>;
	leaveAndCover: Array<ScheduleAssignment>;
};

/**
 * The Issues panel's list for one header. A member's: what the engine left
 * about them and on their days in view, then their days to decide and their
 * leave and cover on those days. A day's: what the engine left about the
 * day as a whole.
 */
export const issuesOfHeader = (
	about: IssuesAbout,
	sources: {
		placed: GridFindings | undefined;
		/** The days in view, Monday first. */
		days: ReadonlyArray<string>;
		daysToDecide: ReadonlyArray<ScheduleAssignment>;
		leaveAndCover: ReadonlyArray<ScheduleAssignment>;
	}
): IssuesOfHeader => {
	const { placed, days } = sources;
	if (about.kind === "date")
		return {
			findings: [...(placed?.byDate.get(about.date) ?? NO_FINDINGS)],
			daysToDecide: [],
			leaveAndCover: [],
		};
	const member = { membershipId: about.membershipId };
	const shown = new Set(days);
	const theirs = (row: ScheduleAssignment): boolean =>
		row.member?.membershipId === about.membershipId && shown.has(row.day);
	return {
		findings: [
			...(placed?.byRow.get(about.membershipId) ?? NO_FINDINGS),
			...days.flatMap((date) => cellFindings(placed, member, date)),
		],
		daysToDecide: sources.daysToDecide.filter(theirs),
		leaveAndCover: sources.leaveAndCover.filter(theirs),
	};
};
