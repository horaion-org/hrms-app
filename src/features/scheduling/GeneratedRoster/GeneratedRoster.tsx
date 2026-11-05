import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { StatCard } from "@/components/ui/StatCard";
import { FindingsPanel } from "@/features/scheduling/FindingsPanel";
import { FindingsSummary } from "@/features/scheduling/FindingsSummary";
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
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { RosterWeekBar } from "@/features/scheduling/RosterWeekBar";
import { mondayOf, weeksOf } from "@/features/scheduling/schedules";
import type {
	Schedule,
	ScheduleAssignment,
} from "@/features/scheduling/schedules/api";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";

/** What the roster reads of its schedule: its week, the zone its days are in and, for the findings, its generation. */
export type RosterSchedule = Pick<
	Schedule,
	"periodStart" | "periodEnd" | "timeZone"
> &
	Partial<Pick<Schedule, "generation">>;

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
};

/** A worked day chosen on the roster. */
type ChosenDay = { row: RosterRow; day: string; shift: RosterShiftCell };

const key = "scheduling.detail";

/**
 * A generated schedule's roster, a week at a time: what it adds up to, what
 * the engine found (a summary, the findings panel and marks on the grid), and
 * a chosen day's shift beside it, read-only.
 */
export const GeneratedRoster = ({
	schedule,
	assignments,
	shifts = [],
	constraints = [],
	startingRuns,
	withSummary = true,
}: GeneratedRosterProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	// "This week" follows the branch's time zone, not the browser's.
	const thisWeek = (): string =>
		mondayOf(isoDateIn(schedule.timeZone, new Date()));
	const [week, setWeek] = useState(thisWeek);
	const [chosen, setChosen] = useState<ChosenDay>();
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
							rowNotes={rowNotes}
							rows={rows}
							selectedShiftId={chosen?.shift.assignmentId}
							findings={
								findings && names
									? {
											placed: placeFindings(findings, days),
											names,
											onShowAll: showAllFindings,
										}
									: undefined
							}
							onAssignmentSelect={(row, day, shift) => {
								setChosen({ row, day, shift });
							}}
						/>
						{chosen && (
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
