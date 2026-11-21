import { shownDayOf } from "@/common/dayView";
import { mondayOf } from "@/common/weeks";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	findingCounts,
	hasFindings,
} from "@/features/scheduling/roster/findings/findingCounts";
import {
	findingNames,
	type FindingNames,
	type FindingNameSources,
} from "@/features/scheduling/roster/findings/findingNames";
import {
	placeFindings,
	type GridFindings,
} from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	rosterFromAssignments,
	weekDays,
	type RosterCell,
	type RosterRow,
} from "@/features/scheduling/roster/roster";
import {
	cellFindings,
	dayNoteLines,
	saidApartBy,
	type IssuesAbout,
} from "@/features/scheduling/roster/rosterMarks";
import type { RosterDayNotesProps } from "@/features/scheduling/roster/RosterDayNotes";
import {
	coverGapOf,
	issuesAboutOf,
	type RosterPanel,
	type RosterSearch,
} from "@/features/scheduling/roster/rosterSearch";
import {
	changedDays,
	daysToDecide,
	issueCount,
	leaveAndCoverDays,
} from "@/features/scheduling/roster/rosterSummary";
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";
import type { SchedulePeriod } from "@/features/scheduling/periods";
import type {
	GenerationFindings,
	Schedule,
	ScheduleAssignment,
} from "@/features/scheduling/schedules/api";

/** What the roster reads of its schedule: its week, the zone its days are in and, for the findings, its generation. */
export type RosterSchedule = Pick<
	Schedule,
	"periodStart" | "periodEnd" | "coveredFrom" | "coveredTo" | "timeZone"
> &
	Partial<Pick<Schedule, "generation">>;

/** What opens in the one panel beside the grid. */
export type RosterSidePanelKind = "dayEditor" | "shiftDetails" | "list";

/** What the roster view is worked out from. */
export type RosterViewInput = {
	schedule: RosterSchedule;
	assignments: ReadonlyArray<ScheduleAssignment>;
	view: RosterSearch;
	/** Today in the schedule's time zone (`isoDateIn`); "this week" and "today" follow it. */
	today: string;
	/** Name the findings' shifts and rules; empty when not readable. */
	shifts: FindingNameSources["shifts"];
	constraints: FindingNameSources["constraints"];
	/** How many members' week before changed since generation. */
	membersWithChangedStart: number;
	/** The page gives a Details list, and an approval trail, only when it has them. */
	hasDetails: boolean;
	hasApproval: boolean;
	/**
	 * Whether the roster may be validated here (someone who may change it):
	 * Issues then opens even when empty, to show what validating found.
	 */
	hasValidation?: boolean;
	/** Issues the last validation adds to the generation's: the working-time rules it found broken. */
	brokenRuleIssues?: number;
	/** Days may be changed by hand: a chosen day opens its editor rather than its shift. */
	editable: boolean;
	/** The manager's tools are shown, so a chosen day's panel starts with what needs a look. */
	withSummary: boolean;
	/** The editor offers leave choices, so it says requested leave in its own words. */
	changesLeave: boolean;
};

/** Everything the roster shows that follows from its rows and its view. */
export type RosterView = {
	period: SchedulePeriod;
	/** The week's seven days, Monday first. */
	days: Array<string>;
	/** The week's days inside the period, which a phone steps through. */
	periodDays: Array<string>;
	/** The week's days the schedule does not cover (API ADR-0113): greyed, with no cells. */
	outsideDays: Array<string>;
	/** The one day a phone shows. */
	shownDay: string | undefined;
	rows: Array<RosterRow>;
	findings: GenerationFindings | null;
	/** Names for the findings; none when there are none to name. */
	names: FindingNames | null;
	/** The findings placed on this week's grid; none without named findings. */
	placed: GridFindings | undefined;
	/** The days changed by hand, on leave or covered, and to decide, as their roster rows. */
	changed: Array<ScheduleAssignment>;
	leaveAndCover: Array<ScheduleAssignment>;
	toDecide: Array<ScheduleAssignment>;
	/** The `rosterCellKey`s of days changed by hand. */
	editedDays: ReadonlySet<string>;
	/** How many entries each list has; a list with none isn't offered. */
	listCounts: Record<RosterPanel, number>;
	/** The chosen day's roster row, its member's grid row and cell. */
	chosenRow: ScheduleAssignment | undefined;
	chosenMemberRow: RosterRow | undefined;
	chosenCell: RosterCell | undefined;
	/** The list shown beside the grid: the one the URL names, while no day is chosen and it has something in it. */
	openList: RosterPanel | undefined;
	/** The header the Issues list was opened from, if any: it lists only what that header counted. */
	issuesAbout: IssuesAbout | undefined;
	/** The short shift-day "Find cover" opened Issues on, its row open; on a roster that may be changed. */
	coverGap: CoverGapRequest | undefined;
	/** What the panel beside the grid shows; nothing, and a full-width grid, without. */
	sidePanel: RosterSidePanelKind | undefined;
	/** What needs a look on the chosen day, said first in its panel; none when nothing beyond what the editor says. */
	chosenDayNotes: Omit<RosterDayNotesProps, "viewerMembershipId"> | undefined;
};

/**
 * The panel beside the grid: a chosen day first (its editor, else its
 * shift), else the open list (Issues, with a short shift's row open when
 * "Find cover" opened it).
 */
export const sidePanelOf = ({
	editable,
	chosenRow,
	chosenCell,
	openList,
}: {
	editable: boolean;
	chosenRow: ScheduleAssignment | undefined;
	chosenCell: RosterCell | undefined;
	openList: RosterPanel | undefined;
}): RosterSidePanelKind | undefined => {
	if (editable && chosenRow) return "dayEditor";
	if (!editable && chosenCell?.kind === "shift" && chosenRow)
		return "shiftDetails";
	if (openList) return "list";
	return undefined;
};

/**
 * What needs a look on the chosen day: none on a member's own roster,
 * which marks no issues, or on a day with nothing to say beyond what the
 * editor says itself.
 */
const chosenDayNotesOf = ({
	withSummary,
	editable,
	changesLeave,
	placed,
	names,
	chosenRow,
	chosenMemberRow,
	chosenCell,
}: Pick<RosterViewInput, "withSummary" | "editable" | "changesLeave"> &
	Pick<
		RosterView,
		"placed" | "names" | "chosenRow" | "chosenMemberRow" | "chosenCell"
	>): RosterView["chosenDayNotes"] => {
	if (!withSummary || !chosenRow || !chosenMemberRow) return undefined;
	const dayFindings = cellFindings(placed, chosenMemberRow, chosenRow.day);
	const saidApart = saidApartBy(editable ? { changesLeave } : undefined);
	if (
		dayFindings.length === 0 &&
		dayNoteLines(chosenCell?.note, saidApart).length === 0
	)
		return undefined;
	return {
		findings: names ? { list: dayFindings, names } : undefined,
		membershipId: chosenMemberRow.membershipId,
		note: chosenCell?.note,
		saidApart,
	};
};

/**
 * The roster's view, worked out on every render from its rows and the URL's
 * view: the week and the day a phone shows, the grid's rows and marks, each
 * list's count, the chosen day, and what opens beside the grid.
 */
export const rosterViewOf = ({
	schedule,
	assignments,
	view,
	today,
	shifts,
	constraints,
	membersWithChangedStart,
	hasDetails,
	hasApproval,
	hasValidation = false,
	brokenRuleIssues = 0,
	editable,
	withSummary,
	changesLeave,
}: RosterViewInput): RosterView => {
	// The days this schedule covers: its whole week, or a run of it (API ADR-0113).
	const period = { start: schedule.coveredFrom, end: schedule.coveredTo };
	const week = view.week ?? mondayOf(today);
	const days = weekDays(period, week);
	const rows = rosterFromAssignments(assignments, period);
	const findings = schedule.generation?.findings ?? null;
	const counts = findings ? findingCounts(findings) : null;
	// Names whenever there is a finding to show, information notes ("Rest carried in from before") included.
	const names =
		findings &&
		counts &&
		(hasFindings(counts) || findings.diagnostics.length > 0)
			? findingNames(findings, { assignments, shifts, constraints })
			: null;
	const changed = changedDays(assignments);
	const leaveAndCover = leaveAndCoverDays(assignments);
	const toDecide = daysToDecide(assignments);
	const editedDays = new Set(
		changed.flatMap((row) =>
			row.member ? [rosterCellKey(row.member.membershipId, row.day)] : []
		)
	);
	const listCounts: Record<RosterPanel, number> = {
		issues:
			issueCount({
				findings: counts,
				membersWithChangedStart,
				leaveAndCoverDays: leaveAndCover.length,
				daysToDecide: toDecide.length,
			}) + brokenRuleIssues,
		changes: changed.length,
		details: hasDetails ? 1 : 0,
		approval: hasApproval ? 1 : 0,
	};
	const chosenRow = assignments.find(
		(row) =>
			row.member !== null &&
			rosterCellKey(row.member.membershipId, row.day) === view.cell
	);
	// A phone shows one of the week's days inside the period, the grid hiding the others'
	// columns: a chosen day's, so its tile stays in view, else the URL's.
	const periodDays = days.filter(
		(day) => day >= period.start && day <= period.end
	);
	const shownDay = shownDayOf(periodDays, chosenRow?.day ?? view.day, today);
	const coverGap = editable && !chosenRow ? coverGapOf(view.cover) : undefined;
	// Issues opens for a short shift "Find cover" names even when nothing else is listed.
	const openable = (panel: RosterPanel): boolean =>
		listCounts[panel] > 0 ||
		(panel === "issues" && (hasValidation || coverGap !== undefined));
	const openList =
		view.panel && !chosenRow && openable(view.panel) ? view.panel : undefined;
	const chosenMemberRow = rows.find(
		(row) => row.membershipId === chosenRow?.member?.membershipId
	);
	const chosenCell = chosenMemberRow?.days[chosenRow?.day ?? ""];
	const placed = findings && names ? placeFindings(findings, days) : undefined;
	return {
		period,
		days,
		periodDays,
		outsideDays: days.filter((day) => !periodDays.includes(day)),
		shownDay,
		rows,
		findings,
		names,
		placed,
		changed,
		leaveAndCover,
		toDecide,
		editedDays,
		listCounts,
		chosenRow,
		chosenMemberRow,
		chosenCell,
		openList,
		issuesAbout: openList === "issues" ? issuesAboutOf(view) : undefined,
		coverGap,
		sidePanel: sidePanelOf({
			editable,
			chosenRow,
			chosenCell,
			openList,
		}),
		chosenDayNotes: chosenDayNotesOf({
			withSummary,
			editable,
			changesLeave,
			placed,
			names,
			chosenRow,
			chosenMemberRow,
			chosenCell,
		}),
	};
};
