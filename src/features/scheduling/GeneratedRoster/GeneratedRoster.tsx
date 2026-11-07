import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { CountBadge } from "@/components/ui/CountBadge";
import {
	DescriptionList,
	type DescriptionListItem,
} from "@/components/ui/DescriptionList";
import { FilterChips } from "@/components/ui/FilterChips";
import { FindingList } from "@/features/scheduling/FindingList";
import { FindingsPanel } from "@/features/scheduling/FindingsPanel";
import { LastRosterChange } from "@/features/scheduling/LastRosterChange";
import {
	findingCounts,
	hasFindings,
} from "@/features/scheduling/roster/findings/findingCounts";
import {
	findingNames,
	type FindingNameSources,
} from "@/features/scheduling/roster/findings/findingNames";
import { findingFamily } from "@/features/scheduling/roster/findings/finding";
import { placeFindings } from "@/features/scheduling/roster/findings/findingsOnGrid";
import { formatDay } from "@/features/scheduling/periods";
import { RosterDayNotes } from "@/features/scheduling/RosterDayNotes";
import {
	isoDateIn,
	legendOf,
	rosterFromAssignments,
	weekDays,
	type RosterRow,
} from "@/features/scheduling/roster/roster";
import {
	cellFindings,
	dayNoteLines,
	issuesOfHeader,
	saidApartBy,
	type IssuesAbout,
} from "@/features/scheduling/roster/rosterMarks";
import {
	changedDayItems,
	daysToDecideItems,
	leaveAndCoverItems,
	startingPointItems,
} from "@/features/scheduling/roster/rosterPanels";
import {
	issuesAboutOf,
	type RosterPanel,
	type RosterSearch,
} from "@/features/scheduling/roster/rosterSearch";
import {
	changedDays,
	daysToDecide,
	issueCount,
	leaveAndCoverDays,
	rosterSummarySegments,
	type SummarySegment,
} from "@/features/scheduling/roster/rosterSummary";
import { RosterCellPanel } from "@/features/scheduling/RosterCellPanel";
import type { RosterChange } from "@/features/scheduling/rosterChanges/api";
import { rosterCellKey } from "@/features/scheduling/rosterChanges/rosterEdit";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import {
	RosterSidePanel,
	type RosterSidePanelSection,
} from "@/features/scheduling/RosterSidePanel";
import { RosterWeekBar } from "@/features/scheduling/RosterWeekBar";
import { mondayOf, weeksOf } from "@/features/scheduling/schedules";
import type {
	Schedule,
	ScheduleAssignment,
	ScheduleShift,
} from "@/features/scheduling/schedules/api";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";
import { ROSTER_SIDE_LISTS } from "./rosterSideLists";

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
	/** Given to someone who may change leave here too: the leave choices beside the roster's own. */
	leave?: { viewerMembershipId: string };
};

export type GeneratedRosterProps = {
	schedule: RosterSchedule;
	/** The schedule's roster rows, as `GET …/assignments` answers them. */
	assignments: Array<ScheduleAssignment>;
	/** The week and side panel shown, as the route's search carries them. */
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
	/**
	 * Whether the manager's tools are shown: the summary line, the Issues
	 * and Changed buttons and the issue marks on the grid. A member's own
	 * view leaves them out, and marks only their changed days.
	 */
	withSummary?: boolean;
	/** Lets a day be changed by hand beside the grid; read-only without. */
	editing?: RosterEditing;
	/** The viewer's own membership, which decides where a chosen day's leave request opens. */
	viewerMembershipId?: string;
};

const NO_DAYS: ReadonlySet<string> = new Set();

/** Hours in the summary line keep one decimal at most: "37.5 h". */
const HOURS_FRACTION_DIGITS = 1;

const key = "scheduling.detail";

/** What has focus now, to give it back when a panel opened from it closes. */
const focusedElement = (): HTMLElement | null =>
	document.activeElement instanceof HTMLElement ? document.activeElement : null;

/** The `rosterCellKey` of a row's day; none once its member no longer resolves. */
const cellOf = (row: RosterRow, day: string): string | undefined =>
	row.membershipId === null ? undefined : rosterCellKey(row.membershipId, day);

/**
 * A generated schedule's roster, a week at a time, kept quiet at rest: one
 * summary line, the week bar with the Issues and Changed buttons, and the
 * grid. Everything else opens in the one panel beside the grid, named by
 * the view in the URL: a chosen day's shift (read-only) or editor, or one
 * list (Issues, Changed, Details). Findings are also marked on the grid.
 * A member's own roster shows only the grid, with their changed days marked.
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
	withSummary = true,
	editing,
	viewerMembershipId,
}: GeneratedRosterProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const [previewDays, setPreviewDays] = useState<ReadonlySet<string>>(NO_DAYS);
	const [applied, setApplied] = useState<RosterChange>();
	const sidePanelId = useId();
	// Where focus goes back to when the panel closes: what opened it.
	const opener = useRef<HTMLElement | null>(null);
	const onPreviewDays = useCallback((keys: ReadonlyArray<string>) => {
		setPreviewDays(keys.length === 0 ? NO_DAYS : new Set(keys));
	}, []);

	const period = { start: schedule.periodStart, end: schedule.periodEnd };
	// "This week" follows the branch's time zone, not the browser's.
	const week = view.week ?? mondayOf(isoDateIn(schedule.timeZone, new Date()));
	const days = weekDays(period, week);
	const rows = rosterFromAssignments(assignments, period);
	const findings = schedule.generation?.findings ?? null;
	const counts = findings ? findingCounts(findings) : null;
	const names =
		findings && counts && hasFindings(counts)
			? findingNames(findings, { assignments, shifts, constraints })
			: null;
	const changed = changedDays(assignments);
	const markedDays = leaveAndCoverDays(assignments);
	const toDecide = daysToDecide(assignments);
	const editedDays = new Set(
		changed.flatMap((row) =>
			row.member ? [rosterCellKey(row.member.membershipId, row.day)] : []
		)
	);
	const listCounts: Record<RosterPanel, number> = {
		issues: issueCount({
			findings: counts,
			membersWithChangedStart,
			leaveAndCoverDays: markedDays.length,
			daysToDecide: toDecide.length,
		}),
		changes: changed.length,
		details: details ? 1 : 0,
	};
	const chosenRow = assignments.find(
		(row) =>
			row.member !== null &&
			rosterCellKey(row.member.membershipId, row.day) === view.cell
	);
	// The list shown beside the grid: the one the URL names, while no day is chosen and it has something in it.
	const openList =
		view.panel && !chosenRow && listCounts[view.panel] > 0
			? view.panel
			: undefined;
	const chosenMemberRow = rows.find(
		(row) => row.membershipId === chosenRow?.member?.membershipId
	);
	const chosenCell = chosenMemberRow?.days[chosenRow?.day ?? ""];
	const placed = findings && names ? placeFindings(findings, days) : undefined;
	// The header the Issues list was opened from, if any: it lists only what that header counted.
	const issuesAbout = openList === "issues" ? issuesAboutOf(view) : undefined;

	const showView = (next: Omit<RosterSearch, "week">): void => {
		onViewChange({ ...(view.week ? { week: view.week } : {}), ...next });
	};
	/** Opens `next` beside the grid; focus goes back to `from` when it closes. */
	const open = (
		next: Omit<RosterSearch, "week">,
		from: HTMLElement | null = focusedElement()
	): void => {
		opener.current = from;
		setPreviewDays(NO_DAYS);
		showView(next);
	};
	const close = (): void => {
		setPreviewDays(NO_DAYS);
		showView({});
		opener.current?.focus();
	};
	/** Closes the open list, or opens `panel`; Issues opened from a header shows all of Issues instead. */
	const toggleList = (panel: RosterPanel, from: HTMLElement): void => {
		if (openList === panel && !issuesAbout) close();
		else open({ panel }, from);
	};
	/** Shows every issue again, keeping where focus goes back to. */
	const showAllIssues = (): void => {
		showView({ panel: "issues" });
	};
	/** The week bar's buttons: each list that has one, while it has something to show. */
	const toolbarLists = withSummary
		? (Object.keys(ROSTER_SIDE_LISTS) as Array<RosterPanel>).flatMap(
				(panel) => {
					const button = ROSTER_SIDE_LISTS[panel].button;
					const count = listCounts[panel];
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
	/** One line each, said above the findings in the Issues panel. */
	const issueNotes = [
		...(membersWithChangedStart > 0
			? [
					t("scheduling.startingContext.stale", {
						count: membersWithChangedStart,
					}),
				]
			: []),
		...(findings && editedDays.size > 0
			? [t("scheduling.rosterEdit.findingsOutOfDate")]
			: []),
	];
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
	/** The Issues list for one header: its filter as a chip, then exactly what that header counted. */
	const headerIssueSections = (
		about: IssuesAbout
	): Array<RosterSidePanelSection> => {
		const listed = issuesOfHeader(about, {
			placed,
			days,
			daysToDecide: toDecide,
			leaveAndCover: markedDays,
		});
		const chipLabel =
			about.kind === "date"
				? formatDay(about.date, language)
				: (rows.find((row) => row.membershipId === about.membershipId)?.name ??
					t(`${key}.formerMember`));
		const findingPart = (family: "roster" | "setup"): ReactNode => {
			const part = listed.findings.filter(
				(finding) => findingFamily(finding) === family
			);
			return (
				names &&
				part.length > 0 && (
					<FindingList
						findings={part}
						names={names}
						showDates={about.kind === "member"}
					/>
				)
			);
		};
		return [
			{
				key: "about",
				content: (
					<FilterChips
						chips={[
							{ key: about.kind, label: chipLabel, onRemove: showAllIssues },
						]}
						onClearAll={showAllIssues}
					/>
				),
			},
			{
				key: "roster",
				title: t("scheduling.findings.marker.roster"),
				content: findingPart("roster"),
			},
			{
				key: "setup",
				title: t("scheduling.findings.marker.setup"),
				content: findingPart("setup"),
			},
			{
				key: "daysToDecide",
				title: t(`${key}.daysToDecide`),
				items: daysToDecideItems(listed.daysToDecide, t, language),
			},
			{
				key: "leaveAndCover",
				title: t(`${key}.leaveAndCover`),
				items: leaveAndCoverItems(listed.leaveAndCover, t, language),
			},
		];
	};
	const listSections: Record<RosterPanel, Array<RosterSidePanelSection>> = {
		issues: issuesAbout
			? headerIssueSections(issuesAbout)
			: [
					// Each note is a section of its own, spaced like the sections around it.
					...issueNotes.map((line) => ({
						key: line,
						items: [{ key: line, lines: [line] }],
					})),
					{
						key: "findings",
						content: findings && names && (
							<FindingsPanel
								findings={findings}
								names={names}
								visibleDays={days}
							/>
						),
					},
					{
						key: "daysToDecide",
						title: t(`${key}.daysToDecide`),
						items: daysToDecideItems(toDecide, t, language),
					},
					{
						key: "leaveAndCover",
						title: t(`${key}.leaveAndCover`),
						items: leaveAndCoverItems(markedDays, t, language),
					},
					{
						key: "startingPoints",
						title: t(`${key}.startingPoints`),
						items: startingPointItems(rows, startingRuns, t),
					},
				],
		changes: [
			{ key: "latest", content: latestChange },
			{ key: "days", items: changedDayItems(changed, t, language) },
		],
		details: [
			{
				key: "details",
				content: details && (
					<DescriptionList items={details} valueWidth="sm:w-3/5" />
				),
			},
		],
	};

	/**
	 * What needs a look on the chosen day, first in its panel: none on a
	 * member's own roster, which marks no issues, or on a day with nothing
	 * to say beyond what the editor says itself.
	 */
	const chosenDayIssues = (): ReactNode => {
		if (!withSummary || !chosenRow || !chosenMemberRow) return undefined;
		const dayFindings = cellFindings(placed, chosenMemberRow, chosenRow.day);
		const saidApart = saidApartBy(
			editing && { changesLeave: editing.leave !== undefined }
		);
		if (
			dayFindings.length === 0 &&
			dayNoteLines(chosenCell?.note, saidApart).length === 0
		)
			return undefined;
		return (
			<RosterDayNotes
				findings={names ? { list: dayFindings, names } : undefined}
				membershipId={chosenMemberRow.membershipId}
				note={chosenCell?.note}
				saidApart={saidApart}
				viewerMembershipId={viewerMembershipId}
			/>
		);
	};

	/** The panel beside the grid: a chosen day first, else the open list. */
	const sidePanel = (): ReactNode => {
		if (editing && chosenRow)
			return (
				<RosterCellPanel
					// Each day starts with nothing chosen.
					key={chosenRow.assignmentId}
					assignment={chosenRow}
					assignments={assignments}
					issues={chosenDayIssues()}
					leaveEditing={editing.leave}
					notifiesMembers={editing.notifiesMembers}
					revision={editing.revision}
					shifts={editing.shifts}
					target={editing.target}
					onClose={close}
					onLeaveChanged={close}
					onPreviewDays={onPreviewDays}
					onApplied={(change) => {
						setApplied(change);
						close();
					}}
				/>
			);
		if (!editing && chosenCell?.kind === "shift" && chosenRow)
			return (
				<ShiftDetailsPanel
					issues={chosenDayIssues()}
					shift={{ ...chosenCell, date: chosenRow.day }}
					staffName={chosenRow.member?.displayName ?? t(`${key}.formerMember`)}
					onClose={close}
				/>
			);
		if (openList)
			return (
				<RosterSidePanel
					// A new list or filter starts afresh, its heading taking focus.
					key={`${openList}|${view.member ?? view.date ?? ""}`}
					id={sidePanelId}
					sections={listSections[openList]}
					title={t(ROSTER_SIDE_LISTS[openList].titleKey)}
					onClose={close}
				/>
			);
		return null;
	};

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
						weeks={weeksOf(period)}
						onToday={() => {
							onViewChange({ ...view, week: undefined });
						}}
						onWeekChange={(next) => {
							onViewChange({ ...view, week: next });
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
									toggleList(panel, event.currentTarget);
								}}
							>
								{t(ROSTER_SIDE_LISTS[panel].titleKey)}
								<CountBadge aria-hidden="true" count={count} tone="inactive" />
							</Button>
						))}
					</RosterWeekBar>
					<div className="mt-4 flex flex-col items-start gap-6 lg:flex-row">
						<RosterGrid
							className="w-full lg:flex-1"
							days={days}
							editedDays={editedDays}
							findings={placed}
							previewDays={previewDays}
							rows={rows}
							selectedDayKey={editing ? view.cell : undefined}
							selectedShiftId={chosenRow?.assignmentId}
							showsIssues={withSummary}
							onAssignmentSelect={(row, day) => {
								const cell = cellOf(row, day);
								if (cell) open({ cell });
							}}
							onDaySelect={
								editing
									? (row, day): void => {
											const cell = cellOf(row, day);
											if (cell) open({ cell });
										}
									: undefined
							}
							onShowIssues={(about, from) => {
								open(
									about.kind === "member"
										? { panel: "issues", member: about.membershipId }
										: { panel: "issues", date: about.date },
									from
								);
							}}
						/>
						{sidePanel()}
					</div>
				</>
			)}
		</>
	);
};
