import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { StatCard } from "@/components/ui/StatCard";
import { ReviewNotes } from "@/features/scheduling/ReviewNotes";
import { reviewNoteCount } from "@/features/scheduling/roster/findingsByMember";
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

export type GeneratedRosterProps = {
	schedule: Schedule;
	/** The schedule's roster rows, as `GET …/assignments` answers them. */
	assignments: Array<ScheduleAssignment>;
};

/** A worked day chosen on the roster. */
type ChosenDay = { row: RosterRow; day: string; shift: RosterShiftCell };

const key = "scheduling.detail";

/**
 * A generated schedule's roster, a week at a time: what it adds up to, the
 * engine's notes to review, and a chosen day's shift beside it, read-only.
 */
export const GeneratedRoster = ({
	schedule,
	assignments,
}: GeneratedRosterProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	// "This week" follows the branch's time zone, not the browser's.
	const thisWeek = (): string =>
		mondayOf(isoDateIn(schedule.timeZone, new Date()));
	const [week, setWeek] = useState(thisWeek);
	const [chosen, setChosen] = useState<ChosenDay>();
	const [notesOpen, setNotesOpen] = useState(false);
	const period = { start: schedule.periodStart, end: schedule.periodEnd };
	const rows = rosterFromAssignments(assignments, period);
	const stats = rosterStats(rows);
	const days = weekDays(period, week);
	const findings = schedule.generation?.findings ?? null;
	const notes = findings ? reviewNoteCount(findings) : 0;
	const numbers = new Intl.NumberFormat(language);

	return (
		<>
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
			{findings && notes > 0 && (
				<>
					<Callout className="mt-6">
						<span className="flex flex-wrap items-center gap-x-4 gap-y-1">
							{t("scheduling.generation.notesSummary", { count: notes })}
							<Button
								variant="textlink"
								onClick={() => {
									setNotesOpen(true);
								}}
							>
								{t("scheduling.generation.reviewNotes")}
							</Button>
						</span>
					</Callout>
					<Dialog
						description={t("scheduling.generation.notesDescription")}
						open={notesOpen}
						title={t("scheduling.generation.reviewNotes")}
						onClose={() => {
							setNotesOpen(false);
						}}
					>
						<ReviewNotes findings={findings} />
					</Dialog>
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
							rows={rows}
							selectedShiftId={chosen?.shift.assignmentId}
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
