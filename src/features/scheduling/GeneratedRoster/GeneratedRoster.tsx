import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { weeksOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { DaySwitcher } from "@/components/ui/DaySwitcher";
import type { DescriptionListItem } from "@/components/ui/DescriptionList";
import { LastRosterChange } from "@/features/scheduling/LastRosterChange";
import { formatDay } from "@/common/formatDay";
import type { FindingNameSources } from "@/features/scheduling/roster/findings/findingNames";
import { legendOf } from "@/features/scheduling/roster/roster";
import { rosterListSections } from "@/features/scheduling/roster/rosterListSections";
import type {
	RosterPanel,
	RosterSearch,
} from "@/features/scheduling/roster/rosterSearch";
import {
	changedDays,
	rosterSummarySegments,
	type SummarySegment,
} from "@/features/scheduling/roster/rosterSummary";
import type { RosterSchedule } from "@/features/scheduling/roster/rosterView";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import {
	RosterWeekBar,
	type RosterWeek,
} from "@/features/scheduling/RosterWeekBar";
import {
	brokenRuleIssueCount,
	generationStoredGap,
	scheduleWithFindingsShown,
	validationStanding,
} from "@/features/scheduling/rulesCheck/issuesFromValidation";
import {
	brokenRuleItems,
	notMetCount,
	notMetItems,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import { ValidationNote } from "@/features/scheduling/rulesCheck/ValidationNote";
import { ValidateScheduleButton } from "@/features/scheduling/rulesCheck/ValidateScheduleButton";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { PreferenceOutcomeLookup } from "@/features/shiftPreferences/preferenceOutcome";
import type { RosterEditing } from "./rosterEditing";
import { RosterSidePanelSlot } from "./RosterSidePanelSlot";
import { ROSTER_SIDE_LISTS } from "./rosterSideLists";
import { useRosterView } from "./useRosterView";

export type GeneratedRosterProps = {
	schedule: RosterSchedule;
	/** The schedule's roster rows, as `GET …/assignments` answers them. */
	assignments: Array<ScheduleAssignment>;
	/** The week, the day a phone shows and the side panel, as the route's search carries them. */
	view: RosterSearch;
	/** Changes the view; the page writes it back to its URL. */
	onViewChange: (view: RosterSearch) => void;
	/** The schedule's frozen shifts, which name the findings' shifts; empty when not readable. */
	shifts?: FindingNameSources["shifts"];
	/** The schedule's frozen constraints, which name the findings' rules; empty when not readable. */
	constraints?: FindingNameSources["constraints"];
	/** The working days in a row each member brought into the period, by member profile; none when not readable. */
	startingRuns?: ReadonlyMap<string, number>;
	/** How many members' week before changed since generation; said in the Issues panel. */
	membersWithChangedStart?: number;
	/** The schedule's history for the Details panel; none, and no Details, without. */
	details?: ReadonlyArray<DescriptionListItem>;
	/** The roster's approval trail for the Approval panel; none, and no Approval panel, without. */
	approval?: ReactNode;
	/**
	 * Whether the manager's tools are shown: the summary line, the Issues
	 * and Changed buttons and the issue marks on the grid. A member's own
	 * view leaves them out, and marks only their changed days.
	 */
	withSummary?: boolean;
	/** Lets a day be changed by hand beside the grid; read-only without. */
	editing?: RosterEditing;
	/**
	 * Validate schedule, read by the page for whoever may read the roster:
	 * its button joins Issues and Changed in the week bar, and its result
	 * opens in the side panel. Not offered without.
	 */
	validation?: RosterValidation;
	/** The viewer's own membership, which decides where a chosen day's leave request opens. */
	viewerMembershipId?: string;
	/** On a member's own roster: their days with an open offer, and its deadline, said in the tile's label. */
	offeredDays?: ReadonlyMap<string, string>;
	/**
	 * The Department's weeks of the schedule's month, for the week bar to
	 * step through, and where choosing one goes; without it the bar pages the
	 * schedule's own weeks, as a member's own roster does.
	 */
	departmentWeeks?: {
		weeks: Array<RosterWeek>;
		onWeekChange: (week: string) => void;
	};
	/** The roster's shift preference outcomes by person and day, said in a chosen day's panel; none without. */
	preferenceOutcomes?: PreferenceOutcomeLookup;
};

/** Hours in the summary line keep one decimal at most: "37.5 h". */
const HOURS_FRACTION_DIGITS = 1;

const key = "scheduling.detail";

/**
 * A generated schedule's roster, a week at a time, kept quiet at rest: one
 * summary line, the week bar with the Issues and Changed buttons, and the
 * grid. Everything else opens in the one panel beside the grid, named by
 * the view in the URL: a chosen day's shift (read-only) or editor, or one
 * list (Issues, Changed, Details, Approval). Findings are also marked on the grid.
 * Validate schedule sits in the week bar after Issues and Changed for whoever may read the roster, lights
 * up once the roster changed since it was last validated, and validates into Issues: the last validation's
 * gaps stand in for the generation's conflicts there, and its broken rules join them
 * (`issuesFromValidation`).
 * A member's own roster shows only the grid, with their changed days marked.
 *
 * What it shows follows from its rows and the view (`rosterViewOf`, through
 * `useRosterView`); the lists are built by `rosterListSections`, and the
 * panel beside the grid is `RosterSidePanelSlot`.
 */
export const GeneratedRoster = ({
	schedule,
	assignments,
	view,
	onViewChange,
	shifts = [],
	constraints = [],
	startingRuns,
	membersWithChangedStart = 0,
	details,
	approval,
	withSummary = true,
	editing,
	validation,
	viewerMembershipId,
	offeredDays,
	departmentWeeks,
	preferenceOutcomes,
}: GeneratedRosterProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const [applied, setApplied] = useState<RosterChange>();
	const sidePanelId = useId();
	// Issues says what is true now: the last validation's gaps and broken rules over the generation's.
	const validating = validation !== undefined;
	const last = validation?.last;
	const standing = validationStanding({
		revision: validation?.revision ?? 0,
		last,
		hasChanges: changedDays(assignments).length > 0,
	});
	const generationFindings = schedule.generation?.findings ?? null;
	const roster = useRosterView({
		schedule: scheduleWithFindingsShown(schedule, last),
		assignments,
		view,
		onViewChange,
		shifts,
		constraints,
		membersWithChangedStart,
		hasDetails: details !== undefined,
		hasApproval: Boolean(approval),
		hasValidation: validating,
		brokenRuleIssues: brokenRuleIssueCount(last),
		editable: editing !== undefined,
		withSummary,
		changesLeave: editing?.leave !== undefined,
	});
	const { rows, days, period, openList } = roster;

	/** The week bar's buttons: each list that has one, while it has something to show. */
	const toolbarLists = withSummary
		? (Object.keys(ROSTER_SIDE_LISTS) as Array<RosterPanel>).flatMap(
				(panel) => {
					const button = ROSTER_SIDE_LISTS[panel].button;
					const count = roster.listCounts[panel];
					return button && count > 0 ? [{ panel, button, count }] : [];
				}
			)
		: [];
	const numbers = new Intl.NumberFormat(language, {
		maximumFractionDigits: HOURS_FRACTION_DIGITS,
	});
	const summaryText = (segment: SummarySegment): string => {
		const { count, total, hours } = segment.values;
		return t(`${key}.summary.${segment.key}`, {
			count,
			total,
			hours: hours === undefined ? undefined : numbers.format(hours),
		});
	};
	const latestChange = editing && (
		<LastRosterChange
			applied={applied}
			notifiesMembers={editing.notifiesMembers}
			revision={editing.revision}
			showsLatest={openList === "changes"}
			target={editing.target}
			onAppliedDismissed={() => {
				setApplied(undefined);
			}}
		/>
	);
	const listSections = openList
		? rosterListSections(openList, {
				roster,
				assignments,
				t,
				language,
				membersWithChangedStart,
				startingRuns,
				coverOffers: editing?.coverOffers && {
					...editing.coverOffers,
					target: editing.target,
					timeZone: schedule.timeZone,
				},
				latestChange,
				details,
				approval,
				validationNote: validating && (
					<ValidationNote standing={standing} validation={validation} />
				),
				brokenRules: last ? brokenRuleItems(last.check, t) : [],
				notMet: last && {
					items: notMetItems(last.check, t, (date) =>
						formatDay(date, language)
					),
					count: notMetCount(last.check),
				},
				onShowAllIssues: roster.showAllIssues,
				onFindCover: editing ? roster.openCover : undefined,
			})
		: [];

	return (
		<>
			{withSummary && (
				<p className="mt-2 text-sm text-neutral-700">
					{rosterSummarySegments(rows).map(summaryText).join(" · ")}
				</p>
			)}
			{openList !== "changes" && latestChange}
			{rows.length === 0 ? (
				<p className="mt-8 text-sm text-neutral-800">{t(`${key}.noRows`)}</p>
			) : (
				<>
					<RosterWeekBar
						className="mt-6"
						legend={legendOf(rows)}
						week={days[0] ?? period.start}
						weeks={departmentWeeks?.weeks ?? weeksOf(period)}
						onToday={() => {
							roster.showWeek(undefined);
						}}
						onWeekChange={(next) => {
							if (departmentWeeks) departmentWeeks.onWeekChange(next);
							else roster.showWeek(next);
						}}
					>
						{toolbarLists.map(({ panel, button, count }) => (
							<Button
								key={panel}
								aria-controls={openList === panel ? sidePanelId : undefined}
								aria-expanded={openList === panel}
								aria-label={t(button.labelKey, { count })}
								leadingIcon={<button.icon className={button.iconTone} />}
								size="sm"
								variant="secondary"
								onClick={(event) => {
									// Opening Issues while its list is out of date validates it first.
									if (
										panel === "issues" &&
										openList !== "issues" &&
										validating &&
										standing === "outOfDate"
									)
										validation.ask();
									roster.toggleList(panel, event.currentTarget);
								}}
							>
								{t(ROSTER_SIDE_LISTS[panel].titleKey)}
								<CountBadge aria-hidden="true" count={count} tone="inactive" />
							</Button>
						))}
						{validation && (
							<ValidateScheduleButton
								hasChanges={roster.listCounts.changes > 0}
								last={validation.last}
								open={openList === "issues"}
								panelId={sidePanelId}
								revision={validation.revision}
								onClick={(from) => {
									validation.ask();
									roster.open({ panel: "issues" }, from);
								}}
							/>
						)}
					</RosterWeekBar>
					{roster.shownDay && (
						<DaySwitcher
							className="mt-4"
							day={roster.shownDay}
							days={roster.periodDays}
							onDayChange={roster.showDay}
						/>
					)}
					<div className="mt-4 flex flex-col items-start gap-6 lg:flex-row">
						<RosterGrid
							className="w-full lg:flex-1"
							compact={roster.sidePanel !== undefined}
							days={days}
							editedDays={roster.editedDays}
							findings={roster.placed}
							offeredDays={offeredDays}
							previewDays={roster.previewDays}
							rows={rows}
							selectedDayKey={editing ? view.cell : undefined}
							selectedShiftId={roster.chosenRow?.assignmentId}
							shownDay={roster.shownDay}
							showsIssues={withSummary}
							onAssignmentSelect={roster.openDay}
							onDaySelect={editing ? roster.openDay : undefined}
							onShowIssues={roster.showIssuesOf}
						/>
						<RosterSidePanelSlot
							assignments={assignments}
							editing={editing}
							preferenceOutcomes={preferenceOutcomes}
							roster={roster}
							timeZone={schedule.timeZone}
							viewerMembershipId={viewerMembershipId}
							engineRepairFor={(gap) =>
								generationStoredGap(generationFindings, gap)
							}
							list={{
								id: sidePanelId,
								resetKey: `${openList ?? ""}|${view.member ?? view.date ?? ""}`,
								sections: listSections,
							}}
							onClose={roster.close}
							onCloseCover={roster.closeCover}
							onFindCover={editing ? roster.openCover : undefined}
							onPreviewDays={roster.onPreviewDays}
							onApplied={(change) => {
								setApplied(change);
								roster.close();
							}}
						/>
					</div>
				</>
			)}
		</>
	);
};
