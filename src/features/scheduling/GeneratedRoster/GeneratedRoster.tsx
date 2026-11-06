import { useCallback, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { StatCard } from "@/components/ui/StatCard";
import { FindingsPanel } from "@/features/scheduling/FindingsPanel";
import { FindingsSummary } from "@/features/scheduling/FindingsSummary";
import { LastRosterChange } from "@/features/scheduling/LastRosterChange";
import {
	findingCounts,
	hasFindings,
} from "@/features/scheduling/roster/findings/findingCounts";
import {
	findingNames,
	type FindingNameSources,
} from "@/features/scheduling/roster/findings/findingNames";
import { placeFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	isoDateIn,
	legendOf,
	rosterFromAssignments,
	rosterStats,
	weekDays,
	type RosterRow,
	type RosterShiftCell,
} from "@/features/scheduling/roster/roster";
import { RosterCellPanel } from "@/features/scheduling/RosterCellPanel";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { RosterWeekBar } from "@/features/scheduling/RosterWeekBar";
import { mondayOf, weeksOf } from "@/features/scheduling/schedules";
import type {
	Schedule,
	ScheduleAssignment,
	ScheduleShift,
} from "@/features/scheduling/schedules/api";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";

/** What the roster reads of its schedule: its week, the zone its days are in and, for the findings, its generation. */
export type RosterSchedule = Pick<
	Schedule,
	"periodStart" | "periodEnd" | "timeZone"
> &
	Partial<Pick<Schedule, "generation">>;

/** What changing the roster by hand needs; given only to someone who may change it now. */
export type RosterEditing = {
	target: RosterChangeTarget;
	/** The roster revision on screen. */
	revision: number;
	/** The schedule's frozen shifts, with their days and roles. */
	shifts: ReadonlyArray<ScheduleShift>;
	/** The roster is published: each change tells the people whose days it changes, so it asks first. */
	notifiesMembers: boolean;
};

export type GeneratedRosterProps = {
	schedule: RosterSchedule;
	/** The schedule's roster rows, as `GET …/assignments` answers them. */
	assignments: Array<ScheduleAssignment>;
	/** The schedule's frozen shifts, which name the findings' shifts; empty when not readable. */
	shifts?: FindingNameSources["shifts"];
	/** The schedule's frozen constraints, which name the findings' rules; empty when not readable. */
	constraints?: FindingNameSources["constraints"];
	/** The working days in a row each member brought into the period, by member profile; none when not readable. */
	startingRuns?: ReadonlyMap<string, number>;
	/** Whether the figures above the roster are shown; a member's own view leaves them out. */
	withSummary?: boolean;
	/** Lets a day be changed by hand beside the grid; read-only without. */
	editing?: RosterEditing;
};

/** A worked day chosen on the roster. */
type ChosenDay = { row: RosterRow; day: string; shift: RosterShiftCell };

const NO_DAYS: ReadonlySet<string> = new Set();

const key = "scheduling.detail";

/**
 * A generated schedule's roster, a week at a time: what it adds up to, what
 * the engine found (a summary, the findings panel and marks on the grid), and
 * a chosen day's shift beside it, read-only. Days changed by hand carry a
 * dot wherever the rows say so (a member's own roster: only their own days
 * changed after publication). With `editing`, any day opens the editor
 * beside the grid instead, and the latest change can be undone from a toast
 * or the line above the grid.
 */
export const GeneratedRoster = ({
	schedule,
	assignments,
	shifts = [],
	constraints = [],
	startingRuns,
	withSummary = true,
	editing,
}: GeneratedRosterProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	// "This week" follows the branch's time zone, not the browser's.
	const thisWeek = (): string =>
		mondayOf(isoDateIn(schedule.timeZone, new Date()));
	const [week, setWeek] = useState(thisWeek);
	const [chosen, setChosen] = useState<ChosenDay>();
	const [editingKey, setEditingKey] = useState<string>();
	const [previewDays, setPreviewDays] = useState<ReadonlySet<string>>(NO_DAYS);
	const [applied, setApplied] = useState<RosterChange>();
	// Where focus goes back to when the editor closes: the day that opened it.
	const opener = useRef<HTMLElement | null>(null);
	const onPreviewDays = useCallback((keys: ReadonlyArray<string>) => {
		setPreviewDays(keys.length === 0 ? NO_DAYS : new Set(keys));
	}, []);
	const [findingsOpen, setFindingsOpen] = useState(false);
	const findingsPanelId = useId();
	const findingsPanel = useRef<HTMLDivElement>(null);
	const period = { start: schedule.periodStart, end: schedule.periodEnd };
	const rows = rosterFromAssignments(assignments, period);
	const stats = rosterStats(rows);
	// "Day 4 of a run": the day Monday would be for a member who brought a run in.
	const rowNotes = new Map(
		rows.flatMap((row) => {
			const run =
				row.memberProfileId === undefined
					? undefined
					: startingRuns?.get(row.memberProfileId);
			return run === undefined
				? []
				: [
						[
							row.key,
							t("scheduling.startingContext.runBadge", { count: run + 1 }),
						] as const,
					];
		})
	);
	const days = weekDays(period, week);
	const findings = schedule.generation?.findings ?? null;
	const counts = findings ? findingCounts(findings) : null;
	const names =
		findings && counts && hasFindings(counts)
			? findingNames(findings, { assignments, shifts, constraints })
			: null;
	const numbers = new Intl.NumberFormat(language);
	const editedDays = new Set(
		assignments.flatMap((row) =>
			row.lastChange && row.member
				? [rosterCellKey(row.member.membershipId, row.day)]
				: []
		)
	);
	const editingAssignment = assignments.find(
		(row) =>
			row.member !== null &&
			rosterCellKey(row.member.membershipId, row.day) === editingKey
	);
	const openEditor = (row: RosterRow, day: string): void => {
		if (row.membershipId === null) return;
		opener.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		setEditingKey(rosterCellKey(row.membershipId, day));
	};
	const closeEditor = (): void => {
		setEditingKey(undefined);
		setPreviewDays(NO_DAYS);
		opener.current?.focus();
	};
	// Opened from a marker's popover: open the panel now, then move to it.
	const showAllFindings = (): void => {
		flushSync(() => {
			setFindingsOpen(true);
		});
		findingsPanel.current?.focus();
	};

	return (
		<>
			{withSummary && (
				<div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
					<StatCard
						title={t(`${key}.staffRostered`)}
						value={numbers.format(stats.staffRostered)}
						caption={t(`${key}.staffRosteredCaption`, {
							total: numbers.format(stats.staffTotal),
						})}
					/>
					<StatCard
						caption={t(`${key}.shiftsAssignedCaption`)}
						title={t(`${key}.shiftsAssigned`)}
						value={numbers.format(stats.shifts)}
					/>
					<StatCard
						caption={t(`${key}.daysOffCaption`)}
						title={t(`${key}.daysOff`)}
						value={numbers.format(stats.daysOff)}
					/>
					<StatCard
						caption={t(`${key}.onLeaveCaption`)}
						title={t(`${key}.onLeave`)}
						value={numbers.format(stats.onLeave)}
					/>
					<StatCard
						caption={t(`${key}.conflictsCaption`)}
						title={t(`${key}.conflicts`)}
						value={numbers.format(findings?.conflicts.length ?? 0)}
					/>
				</div>
			)}
			{findings && counts && names && (
				<>
					<FindingsSummary
						className="mt-6"
						counts={counts}
						expanded={findingsOpen}
						panelId={findingsPanelId}
						onToggle={() => {
							setFindingsOpen(!findingsOpen);
						}}
					/>
					<div
						ref={findingsPanel}
						className="mt-4 outline-none"
						hidden={!findingsOpen}
						id={findingsPanelId}
						tabIndex={-1}
					>
						{findingsOpen && (
							<FindingsPanel
								findings={findings}
								names={names}
								visibleDays={days}
							/>
						)}
					</div>
				</>
			)}
			{findings && editedDays.size > 0 && (
				<Callout className="mt-4">
					{t("scheduling.rosterEdit.findingsOutOfDate")}
				</Callout>
			)}
			{editing && (
				<LastRosterChange
					applied={applied}
					className="mt-6"
					notifiesMembers={editing.notifiesMembers}
					revision={editing.revision}
					target={editing.target}
					onAppliedDismissed={() => {
						setApplied(undefined);
					}}
				/>
			)}
			{rows.length === 0 ? (
				<p className="mt-8 text-sm text-neutral-800">{t(`${key}.noRows`)}</p>
			) : (
				<>
					<RosterWeekBar
						className="mt-12"
						legend={legendOf(rows)}
						week={days[0] ?? period.start}
						weeks={weeksOf(period)}
						onWeekChange={setWeek}
						onToday={() => {
							setWeek(thisWeek());
						}}
					/>
					<div className="mt-7 flex flex-col items-start gap-6 lg:flex-row">
						<RosterGrid
							className="w-full lg:flex-1"
							days={days}
							editedDays={editedDays}
							previewDays={previewDays}
							rowNotes={rowNotes}
							rows={rows}
							selectedDayKey={editingKey}
							findings={
								findings && names
									? {
											placed: placeFindings(findings, days),
											names,
											onShowAll: showAllFindings,
										}
									: undefined
							}
							selectedShiftId={
								editing
									? editingAssignment?.assignmentId
									: chosen?.shift.assignmentId
							}
							onDaySelect={editing ? openEditor : undefined}
							onAssignmentSelect={(row, day, shift) => {
								if (editing) openEditor(row, day);
								else setChosen({ row, day, shift });
							}}
						/>
						{editing && editingAssignment && (
							<RosterCellPanel
								// Each day starts with nothing chosen.
								key={editingAssignment.assignmentId}
								assignment={editingAssignment}
								assignments={assignments}
								notifiesMembers={editing.notifiesMembers}
								revision={editing.revision}
								shifts={editing.shifts}
								target={editing.target}
								onClose={closeEditor}
								onPreviewDays={onPreviewDays}
								onApplied={(change) => {
									setApplied(change);
									closeEditor();
								}}
							/>
						)}
						{!editing && chosen && (
							<ShiftDetailsPanel
								shift={{ ...chosen.shift, date: chosen.day }}
								staffName={chosen.row.name ?? t(`${key}.formerMember`)}
								onClose={() => {
									setChosen(undefined);
								}}
							/>
						)}
					</div>
				</>
			)}
		</>
	);
};
