import { useEffect, useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { weeksOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import { DaySwitcher } from "@/components/ui/DaySwitcher";
import type { DescriptionListItem } from "@/components/ui/DescriptionList";
import { LastRosterChange } from "@/features/scheduling/rosterChanges/LastRosterChange";
import type { FindingNameSources } from "@/features/scheduling/roster/findings/findingNames";
import { legendOf } from "@/features/scheduling/roster/roster";
import {
	issueCounts,
	shortShiftCount,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import {
	IssuesPanelHead,
	type IssueCoverContext,
} from "@/features/scheduling/roster/IssuesPanel";
import type { IssueFixing } from "@/features/scheduling/roster/RosterIssueGroups";
import { issuesOfRoster } from "@/features/scheduling/roster/rosterIssueSources";
import {
	issueNoteLines,
	rosterListSections,
} from "@/features/scheduling/roster/rosterListSections";
import {
	ROSTER_PANELS,
	type RosterSearch,
} from "@/features/scheduling/roster/rosterSearch";
import {
	changedDays,
	rosterSummarySegments,
	type SummarySegment,
} from "@/features/scheduling/roster/rosterSummary";
import type { RosterSchedule } from "@/features/scheduling/roster/rosterView";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";
import { RosterGrid } from "@/features/scheduling/roster/RosterGrid";
import {
	RosterWeekBar,
	type RosterWeek,
} from "@/features/scheduling/roster/RosterWeekBar";
import {
	brokenRuleIssueCount,
	scheduleWithFindingsShown,
	validationStanding,
} from "@/features/scheduling/rulesCheck/issuesFromValidation";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import { checkLineOf } from "@/features/scheduling/rulesCheck/checkLine";
import { ValidateScheduleButton } from "@/features/scheduling/rulesCheck/ValidateScheduleButton";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import type { PreferenceOutcomeLookup } from "@/features/shiftPreferences/preferenceOutcome";
import type { RosterEditing } from "./rosterEditing";
import { RosterSidePanelSlot } from "./RosterSidePanelSlot";
import { ROSTER_SIDE_LISTS } from "./rosterSideLists";
import { useCheckedGaps } from "./useCheckedGaps";
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
	/** Told how many shifts are still short whenever Issues changes, so Publish can warn of them. */
	onShortShiftsChange?: (count: number) => void;
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
	onShortShiftsChange,
}: GeneratedRosterProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const [applied, setApplied] = useState<{
		change: RosterChange;
		stillShort?: string;
	}>();
	// The day a fix from Issues opened in the editor, and the day type it asks for.
	const [fixPreset, setFixPreset] = useState<{
		cell: string;
		dayType: string;
	}>();
	const sidePanelId = useId();
	// Issues says what is true now: the last validation's gaps and broken rules over the generation's.
	const validating = validation !== undefined;
	const last = validation?.last;
	const standing = validationStanding({
		revision: validation?.revision ?? 0,
		last,
		hasChanges: changedDays(assignments).length > 0,
	});
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
	// A list or Find cover keeps to the grid's height and scrolls inside, so it never makes the row taller.
	const panelFollowsGridHeight = roster.sidePanel === "list";

	const checkedGaps = useCheckedGaps({
		standing,
		last,
		coverGap: roster.coverGap,
		view,
		onViewChange,
	});
	const issues = issuesOfRoster({
		roster,
		check: last?.check,
		checkedGaps,
		startingRuns,
		noteLines: issueNoteLines({
			roster,
			membersWithChangedStart,
			validating,
			t,
		}),
		t,
		language,
	});
	// The fixes Issues makes itself: applied as hand changes, or opened in the day's editor with the day type chosen.
	const issueFixing: IssueFixing | undefined = editing && {
		constraints,
		assignments,
		editing,
		onApplied: (change): void => {
			setApplied({ change });
		},
		onOpenDay: (retype): void => {
			const cell = rosterCellKey(retype.membershipId, retype.day);
			setFixPreset({ cell, dayType: retype.to });
			roster.open({ cell });
		},
	};
	// Covering a short shift from its Issues row: applied as a hand change, the list staying open.
	const issueCover: IssueCoverContext | undefined = editing && {
		target: editing.target,
		revision: editing.revision,
		assignments,
		shifts: editing.shifts,
		coverOffers: editing.coverOffers && {
			offers: editing.coverOffers.offers,
			timeZone: schedule.timeZone,
		},
		onPreviewDays: roster.onPreviewDays,
		onApplied: (change, { filled, stillShort }): void => {
			setApplied({ change, stillShort });
			// The roster is checked again by itself once it shows the change, so the rows follow what is left.
			validation?.askAt(change.toRevision);
			// A filled gap keeps no row of its own: the list is the new check's; one still short stays open.
			if (filled && view.cover) onViewChange({ ...view, cover: undefined });
		},
		// A recorded yes applies one change too: the roster is checked again once it shows it.
		onCoverRecorded: (): void => {
			validation?.askAt(editing.revision + 1);
		},
	};
	/** Closes the panel beside the grid, and forgets the day a fix from Issues opened. */
	const closePanel = (): void => {
		setFixPreset(undefined);
		roster.close();
	};
	const presetDayType =
		fixPreset && fixPreset.cell === view.cell ? fixPreset.dayType : undefined;
	const counts = issueCounts(issues);
	const shortShifts = shortShiftCount(issues);
	useEffect(() => {
		onShortShiftsChange?.(shortShifts);
	}, [shortShifts, onShortShiftsChange]);
	/** Outlines every day of an issue's cells, as the day editor outlines the days it would change, and scrolls to the first. */
	const showIssue = (issue: RosterIssue): void => {
		const row = rows.find(
			(candidate) => candidate.memberProfileId === issue.memberProfileId
		);
		const membershipId = row?.membershipId;
		if (!membershipId || !issue.day) return;
		const cellKeys = (issue.days ?? [issue.day]).map((day) =>
			rosterCellKey(membershipId, day)
		);
		roster.onPreviewDays(cellKeys);
		document
			.querySelector(`[data-cell="${CSS.escape(cellKeys[0] ?? "")}"]`)
			?.scrollIntoView({ block: "nearest", inline: "nearest" });
	};

	/** The week bar's buttons: each list that has one, while it has something to show. */
	const toolbarLists = withSummary
		? ROSTER_PANELS.flatMap((panel) => {
				const button = ROSTER_SIDE_LISTS[panel].button;
				const count = roster.listCounts[panel];
				return button && count > 0 ? [{ panel, button, count }] : [];
			})
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
			applied={applied?.change}
			appliedStillShort={applied?.stillShort}
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
				validating,
				issues,
				issueFixing,
				issueCover,
				issueCoverGap: roster.coverGap,
				shifts,
				onShowIssue: showIssue,
				onShowAllIssues: roster.showAllIssues,
				onFindCover: editing ? roster.openCover : undefined,
			})
		: [];
	const sidePanel = (
		<RosterSidePanelSlot
			assignments={assignments}
			editing={editing}
			preferenceOutcomes={preferenceOutcomes}
			presetDayType={presetDayType}
			roster={roster}
			timeZone={schedule.timeZone}
			viewerMembershipId={viewerMembershipId}
			list={{
				id: sidePanelId,
				resetKey: `${openList ?? ""}|${view.member ?? view.date ?? ""}|${view.cover ?? ""}`,
				// A header's narrowed list counts only its own, so the whole week's counts stay off it.
				summary: openList === "issues" && !roster.issuesAbout && (
					<IssuesPanelHead
						checkLine={checkLineOf(standing, validation)}
						mustFix={counts.mustFix}
						onCheck={() => {
							validation?.ask();
						}}
					/>
				),
				sections: listSections,
			}}
			onClose={closePanel}
			onFindCover={editing ? roster.openCover : undefined}
			onPreviewDays={roster.onPreviewDays}
			onApplied={(change, stillShort) => {
				setApplied({ change, stillShort });
				closePanel();
			}}
		/>
	);

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
								leadingIcon={<button.icon className={button.iconTone} />}
								size="sm"
								variant="secondary"
								aria-label={
									panel === "issues"
										? t("scheduling.issues.weekBarLabel", {
												count: counts.mustFix,
												notMet: counts.notMet,
											})
										: t(button.labelKey, { count })
								}
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
								{/* Issues counts what is to fix, and beside it in amber what could not be met. */}
								<CountBadge
									aria-hidden="true"
									count={panel === "issues" ? counts.mustFix : count}
									tone="inactive"
								/>
								{panel === "issues" && (
									<CountBadge
										aria-hidden="true"
										count={counts.notMet}
										tone="warning"
									/>
								)}
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
					<div className="mt-4 flex flex-col items-start gap-6 lg:flex-row lg:items-stretch">
						<RosterGrid
							className="w-full lg:flex-1 lg:self-start"
							compact={roster.sidePanel !== undefined}
							days={days}
							editedDays={roster.editedDays}
							findings={roster.placed}
							offeredDays={offeredDays}
							outsideDays={roster.outsideDays}
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
						{panelFollowsGridHeight ? (
							// The column takes the row's height (the grid's, at least 28rem) and the panel sits
							// over it, so the hours summary follows the grid; the panel bounds itself to it.
							<div className="relative w-full shrink-0 lg:min-h-112 lg:w-96">
								<div className="lg:absolute lg:inset-0">{sidePanel}</div>
							</div>
						) : (
							sidePanel
						)}
					</div>
				</>
			)}
		</>
	);
};
