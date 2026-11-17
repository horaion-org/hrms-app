import { useQuery } from "@tanstack/react-query";
import type { DayRun } from "@/features/scheduling/dates/api";
import {
	daysAroundPart,
	partRedoOf,
} from "@/features/scheduling/dates/datesSetup";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { DepartmentPath } from "@/common/companyPath";
import { dateTimeFormatIn } from "@/common/dateTimeFormatIn";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { ApprovalTrail } from "@/features/approvals/ApprovalTrail";
import {
	approvalMetaLine,
	approvalStanding,
} from "@/features/approvals/approvalStanding";
import {
	GeneratedRoster,
	type GeneratedRosterProps,
	type RosterEditing,
} from "@/features/scheduling/GeneratedRoster";
import { GenerationFailurePanel } from "@/features/scheduling/GenerationFailurePanel";
import { scheduleMonthQuery } from "@/features/scheduling/months/api";
import {
	formatMonth,
	formatMonthName,
	monthOf,
} from "@/features/scheduling/months/monthWeeks";
import {
	rosterWeekLink,
	rosterWeeksOf,
} from "@/features/scheduling/months/rosterWeeks";
import { formatPeriod } from "@/features/scheduling/periods";
import {
	PublishScheduleDialog,
	publishModeOf,
} from "@/features/scheduling/PublishScheduleDialog";
import { hasRosterHours } from "@/features/scheduling/hours/rosterHoursRows";
import {
	useRosterHours,
	type RosterHoursState,
} from "@/features/scheduling/hours/useRosterHours";
import { useRosterPreferenceOutcomes } from "@/features/scheduling/preferenceOutcomes/usePreferenceOutcomes";
import { RegenerateMonthDialog } from "@/features/scheduling/RegenerateMonthDialog";
import { RejectedRosterCallout } from "@/features/scheduling/RejectedRosterCallout";
import { RejectScheduleDialog } from "@/features/scheduling/RejectScheduleDialog";
import {
	publishedRosterOtherThan,
	publishedWeekQuery,
} from "@/features/scheduling/publishedWeek/api";
import { PublishedWeekCallout } from "@/features/scheduling/publishedWeek/PublishedWeekCallout";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { RosterHeader } from "@/features/scheduling/RosterHeader";
import { RosterHours } from "@/features/scheduling/RosterHours";
import { useRosterRulesCheck } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import { validationStanding } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import { changedDays } from "@/features/scheduling/roster/rosterSummary";
import { useRepairWarmUpOnValidate } from "@/features/scheduling/cover/useRepairWarmUp";
import { coverOffersQuery } from "@/features/scheduling/coverOffers/api";
import { rosterChangeShiftsQuery } from "@/features/scheduling/rosterChanges/api";
import { generationFailure } from "@/features/scheduling/roster/generationFailure";
import { ScheduleMenu } from "@/features/scheduling/ScheduleMenu";
import {
	decidable,
	GENERATION_POLL_INTERVAL_MS,
	generationInProgress,
	hasRoster,
	newestRunFailed,
	regenerable,
	rosterRunId,
} from "@/features/scheduling/schedules/api";
import { rosterPagePermissions } from "@/features/scheduling/schedules/rosterPagePermissions";
import {
	approvalActionFacts,
	scheduleActions,
	type ScheduleActionId,
} from "@/features/scheduling/schedules/scheduleActions";
import {
	actionWaitsForEarlierWeek,
	publishWaitsFor,
} from "@/features/scheduling/schedules/publishOrder";
import { partLinesOf } from "@/features/scheduling/schedules/partLines";
import { scheduleDetailItems } from "@/features/scheduling/schedules/scheduleDetails";
import {
	rosterShown,
	scheduleNotices,
	type ScheduleNoticeFacts,
	type ScheduleNoticeId,
} from "@/features/scheduling/schedules/scheduleNotices";
import { weekPassed } from "@/features/scheduling/schedules/weekPassed";
import { scheduleSetupLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { useCompanySchedule } from "@/features/scheduling/schedules/useSchedule";
import { useScheduleApproval } from "@/features/scheduling/schedules/useScheduleApproval";
import {
	useScheduleAssignments,
	type AssignmentList,
} from "@/features/scheduling/schedules/useScheduleAssignments";
import { useScheduleConstraints } from "@/features/scheduling/schedules/useScheduleConstraints";
import { useScheduleShifts } from "@/features/scheduling/schedules/useScheduleShifts";
import { WithdrawApprovalDialog } from "@/features/scheduling/WithdrawApprovalDialog";
import {
	startingContextQuery,
	type StartingContext,
} from "@/features/scheduling/startingContext/api";
import { runsByMember } from "@/features/scheduling/startingContext/startingGrid";
import { useAccess } from "@/features/workspace/useAccess";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/workspace/useCurrentCompany";

const route = getRouteApi("/_authenticated/_app/scheduling_/$scheduleId");

const key = "scheduling.detail";

/** Why a schedule isn't shown yet: loading, failed, or out of reach (absent or not readable alike). */
const SCHEDULE_PROBLEMS = {
	pending: "loading",
	error: "loadFailed",
	hidden: "unavailable",
	missing: "unavailable",
} as const;

/** Why a generated schedule's roster isn't shown yet. */
const ROSTER_PROBLEMS = {
	pending: "rosterLoading",
	error: "rosterFailed",
	hidden: "unavailable",
} as const;

/**
 * Back to the schedule's month page, named by the month ("November 2026"),
 * once the schedule is known; back to Scheduling before that.
 */
const BackLink = ({
	month,
	departmentId,
}: {
	month?: string;
	departmentId?: string;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	if (month === undefined || departmentId === undefined)
		return (
			<Button
				leadingIcon={<ArrowLeftIcon />}
				to="/scheduling"
				variant="textlink"
			>
				{t(`${key}.back`)}
			</Button>
		);
	return (
		<Button
			leadingIcon={<ArrowLeftIcon />}
			params={{ month }}
			search={{ department: departmentId }}
			to="/scheduling/months/$month"
			variant="textlink"
		>
			{formatMonth(month, formattingLocale(i18n))}
		</Button>
	);
};

/** A line saying why something isn't shown; an alert unless it is still loading. */
const Problem = ({
	alert,
	children,
}: {
	alert: boolean;
	children: string;
}): FunctionComponent => (
	<p
		className="mt-6 text-sm text-neutral-800"
		role={alert ? "alert" : undefined}
	>
		{children}
	</p>
);

/** Shown in place of the roster when its route fails. */
export const ScheduleDetailProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackLink />
			<Problem alert>{t(`${key}.loadFailed`)}</Problem>
		</>
	);
};

/** A list's items once read; empty while loading, failed or not readable, as only names come from it. */
const readyItems = <Item,>(
	list: { status: "ready"; items: Array<Item> } | { status: string }
): Array<Item> => ("items" in list ? list.items : []);

/** The roster itself, once the schedule has one: its rows and their hours, or why they aren't shown yet. */
const RosterBody = ({
	assignments,
	startingContext,
	hours,
	...roster
}: Omit<
	GeneratedRosterProps,
	"assignments" | "membersWithChangedStart" | "startingRuns"
> & {
	assignments: AssignmentList;
	/** Where members started the week; undefined until read, or when it can't be. */
	startingContext?: StartingContext;
	/** The roster's hours by person, shown under the grid. */
	hours: RosterHoursState;
}): FunctionComponent => {
	const { t } = useTranslation();
	const viewerMembershipId = useCurrentMembershipId();
	if (assignments.status !== "ready")
		return (
			<Problem alert={assignments.status !== "pending"}>
				{t(`${key}.${ROSTER_PROBLEMS[assignments.status]}`)}
			</Problem>
		);
	const startingRuns = startingContext
		? runsByMember(startingContext)
		: undefined;
	return (
		<>
			<GeneratedRoster
				{...roster}
				assignments={assignments.items}
				startingRuns={startingRuns}
				viewerMembershipId={viewerMembershipId}
				// Only a frozen context can go stale: members whose week before changed since generation.
				membersWithChangedStart={
					startingContext?.frozen === true
						? startingContext.staleMemberProfileIds.length
						: 0
				}
			/>
			<RosterHours
				assignments={assignments.items}
				className="mt-8"
				coveredFrom={roster.schedule.coveredFrom}
				hours={hours}
			/>
		</>
	);
};

/** The dialog open over the roster, if any. */
type OpenDialog =
	| "publish"
	| "reject"
	| "withdraw"
	| "withdrawPublication"
	| "regenerate"
	| undefined;

/**
 * One schedule read by its id alone. It is read again every
 * 15 seconds while its generation is in progress; its roster, and the frozen
 * shifts and constraints that name its findings, are read once it has one
 * (generated, published or rejected). The roster is read per run and per
 * revision, so the poll seeing a new run finish, or a hand change landing,
 * brings its rows without a reload. Someone who may edit its shifts can
 * change a generated roster's days by hand before it is decided, and a
 * published roster's days, telling the people whose days change. The
 * header shows at most one primary action, each only where the person may
 * use it: Publish a generated roster, Regenerate a rejected one, View setup
 * of a draft. Its "More actions" menu holds the rest: Reject, Regenerate,
 * View setup, Details, Export and Delete. A callout stays only when someone
 * must act: the week already published elsewhere, or a rejection.
 *
 * Where an approval flow applies, Publish reads "Submit for approval"; while
 * a submission waits, the person whose step it is gets Approve (Approve and
 * publish on the last step) and Reject, its submitter may withdraw it, and
 * the meta line says where it stands, with "Approval ›" opening its trail
 * beside the grid. A viewer without `approval:read` sees where it stands,
 * and withdraws their own, through the schedule read's `submission`.
 */
const ApiSchedule = ({
	companyId,
	scheduleId,
}: {
	companyId: string;
	scheduleId: string;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const navigateHere = route.useNavigate();
	const viewerMembershipId = useCurrentMembershipId();
	const view = route.useSearch();
	const onViewChange = (next: RosterSearch): void => {
		void navigateHere({ search: next, replace: true });
	};
	const access = useAccess();
	const [openDialog, setOpenDialog] = useState<OpenDialog>();
	const closeDialog = (): void => {
		setOpenDialog(undefined);
	};
	// After an approval decision the header's button is gone, so focus moves to
	// the approval line and one status message is announced (approvals UI
	// research addendum C5); the region is rendered before any message.
	const [announcement, setAnnouncement] = useState("");
	const approvalLineRef = useRef<HTMLSpanElement>(null);
	const focusApprovalLine = useRef(false);
	useEffect(() => {
		if (!focusApprovalLine.current || !approvalLineRef.current) return;
		focusApprovalLine.current = false;
		approvalLineRef.current.focus();
	});
	const decided = (message: string): void => {
		setAnnouncement(message);
		focusApprovalLine.current = true;
	};
	const state = useCompanySchedule(companyId, scheduleId, {
		pollWhileGenerating: true,
	});
	// Its roster is read at the Department the schedule names.
	const unit: DepartmentPath | undefined =
		state.status === "ready"
			? {
					branchId: state.schedule.branchId,
					departmentId: state.schedule.departmentId,
				}
			: undefined;
	// The run its roster comes from: a new finished run reads the new rows.
	const runId =
		state.status === "ready" ? rosterRunId(state.schedule) : undefined;
	const showsRoster = state.status === "ready" && runId !== undefined;
	const assignments = useScheduleAssignments(
		companyId,
		unit,
		scheduleId,
		runId,
		state.status === "ready" ? state.schedule.rosterRevision : 0
	);
	// The roster's hours by person, while the hours ledger holds its days.
	const rosterHours = useRosterHours(
		companyId,
		unit,
		scheduleId,
		runId,
		state.status === "ready" ? state.schedule.rosterRevision : 0,
		state.status === "ready" && hasRosterHours(state.schedule)
	);
	// What the roster made of each person's shift preferences, said in a chosen day's panel.
	const preferenceOutcomes = useRosterPreferenceOutcomes(
		companyId,
		unit,
		scheduleId,
		runId,
		state.status === "ready" ? state.schedule.rosterRevision : 0
	);
	// The frozen shifts and constraints only name what the findings refer to.
	const rosterSchedule = showsRoster ? state.schedule : undefined;
	const shifts = useScheduleShifts(
		companyId,
		rosterSchedule,
		rosterSchedule?.scheduleId
	);
	const constraints = useScheduleConstraints(companyId, rosterSchedule);
	const approval = useScheduleApproval(
		companyId,
		state.status === "ready" ? state.schedule : undefined
	);
	// What the viewer may do here, each at the schedule's Department. The roster
	// editor reads the frozen shifts it offers under its own key, so it needs no
	// shift:read; Validate schedule joins Issues and Changed, and Repair stays
	// with those who may change the roster.
	const permissions = rosterPagePermissions(
		state.status === "ready" ? state.schedule : undefined,
		access
	);
	const { mayEditShifts, mayValidate } = permissions;
	const validation = useRosterRulesCheck(
		mayValidate && runId !== undefined && unit !== undefined
			? { companyId, unit, scheduleId, runId }
			: undefined,
		state.status === "ready" ? state.schedule.rosterRevision : 0
	);
	// Validate schedule lighting up after a hand change warms the engine's worker for the check to come.
	const rosterRevision =
		state.status === "ready" ? state.schedule.rosterRevision : 0;
	useRepairWarmUpOnValidate(
		mayEditShifts && runId !== undefined && unit !== undefined
			? { companyId, unit, scheduleId, runId }
			: undefined,
		rosterRevision,
		validationStanding({
			revision: rosterRevision,
			last: validation.last,
			hasChanges:
				assignments.status === "ready" &&
				changedDays(assignments.items).length > 0,
		}) === "outOfDate"
	);
	const editorShifts = useQuery(
		rosterChangeShiftsQuery(companyId, unit, scheduleId, mayEditShifts)
	);
	// A published roster asks the member before adding or moving their work.
	const publishedForEditing =
		mayEditShifts &&
		state.status === "ready" &&
		state.schedule.status === "PUBLISHED";
	const coverOffers = useQuery(
		coverOffersQuery(companyId, unit, scheduleId, publishedForEditing)
	);
	const startingContext = useQuery(
		startingContextQuery(
			companyId,
			unit,
			scheduleId,
			showsRoster && permissions.mayRead
		)
	);
	// Another schedule already published for the week means this one can't be generated again or published.
	const awaitingPublication =
		state.status === "ready" && state.schedule.status !== "PUBLISHED"
			? state.schedule
			: undefined;
	const publishedWeek = useQuery(
		publishedWeekQuery(
			companyId,
			permissions.mayRead ? unit : undefined,
			awaitingPublication?.periodStart,
			// A part asks about its own days: an earlier part published doesn't hold it up (API ADR-0113).
			awaitingPublication && {
				coveredFrom: awaitingPublication.coveredFrom,
				coveredTo: awaitingPublication.coveredTo,
			}
		)
	);
	const weekPublishedBy = publishedRosterOtherThan(
		publishedWeek.data,
		scheduleId
	);
	// The Department's weeks of the schedule's month, for the week bar and the back link.
	const month =
		state.status === "ready" ? monthOf(state.schedule.periodStart) : "";
	const scheduleMonth = useQuery(
		scheduleMonthQuery(
			companyId,
			unit?.departmentId ?? "",
			month,
			permissions.mayRead
		)
	).data;
	const publishNoteId = useId();
	const monthName = month ? formatMonthName(month, formattingLocale(i18n)) : "";
	if (state.status !== "ready")
		return (
			<>
				<BackLink />
				<Problem alert={state.status !== "pending"}>
					{t(`${key}.${SCHEDULE_PROBLEMS[state.status]}`)}
				</Problem>
			</>
		);
	// A passed week's rules and roster are final, so it is never generated again (API ADR-0091).
	const passed = weekPassed(state.schedule, new Date());
	// Regenerating names the month's weeks, so it waits for the month's read.
	const openRegenerate =
		scheduleMonth !== undefined &&
		!passed &&
		weekPublishedBy === undefined &&
		permissions.mayGenerate
			? (): void => {
					setOpenDialog("regenerate");
				}
			: undefined;
	const editing: RosterEditing | undefined =
		mayEditShifts && runId !== undefined && unit !== undefined
			? {
					target: { companyId, unit, scheduleId, runId },
					revision: state.schedule.rosterRevision,
					shifts: editorShifts.data ?? [],
					nonWorkingDayTypes: state.schedule.nonWorkingDayTypes,
					notifiesMembers: state.schedule.status === "PUBLISHED",
					...(publishedForEditing
						? {
								coverOffers: {
									offers: coverOffers.data ?? [],
									failed: coverOffers.isError,
									retry: (): void => {
										void coverOffers.refetch();
									},
								},
							}
						: {}),
					// Leave choices need the leave keys as well, here at the schedule's Department.
					...(permissions.mayHandleLeave
						? { leave: { viewerMembershipId } }
						: {}),
				}
			: undefined;
	const schedule = state.schedule;
	// A part of its week (API ADR-0113): the week's other days, and a way to schedule the days after it.
	const weekParts =
		scheduleMonth?.weeks.find(
			(week) => week.periodStart === schedule.periodStart
		)?.parts ?? [];
	const around = daysAroundPart(schedule, weekParts);
	const remaining =
		around.after && !around.afterTaken ? around.after : undefined;
	const daysText = (days: DayRun): string =>
		formatPeriod({ start: days.from, end: days.to }, formattingLocale(i18n));
	const partLines = partLinesOf(
		{
			covered: { from: schedule.coveredFrom, to: schedule.coveredTo },
			around,
			// A redo part in the week (API ADR-0129): this schedule is one, or one redoes some of its days.
			redo: partRedoOf(schedule, weekParts),
		},
		daysText,
		t
	);
	const noticeFacts: ScheduleNoticeFacts = {
		status: schedule.status,
		generating: generationInProgress(schedule),
		hasRoster: hasRoster(schedule),
		newestRunFailed: newestRunFailed(schedule),
		weekPublishedElsewhere: weekPublishedBy !== undefined,
		weekPassed: passed,
		rulesChanged:
			scheduleMonth?.weeks.find(
				(week) => week.scheduleId === schedule.scheduleId
			)?.rulesChanged === true,
	};
	const moment = dateTimeFormatIn(formattingLocale(i18n), schedule.timeZone, {
		dateStyle: "medium",
		timeStyle: "short",
	});
	const { mayReject } = permissions;
	const standing = approvalStanding({
		awaitingDecision: decidable(schedule),
		publication: schedule.publication,
		read: approval.read,
		viewerMembershipId,
	});
	const { primary, menu } = scheduleActions({
		status: schedule.status,
		mayPublish: mayReject && weekPublishedBy === undefined,
		mayReject,
		mayWithdraw: permissions.mayWithdraw,
		mayRegenerate: openRegenerate !== undefined,
		hasRoster: rosterShown(noticeFacts),
		...approvalActionFacts(standing),
	});
	const openPublish = (): void => {
		setOpenDialog("publish");
	};
	const metaLine = approvalMetaLine(standing);
	const trail = approval.instance && (
		<ApprovalTrail
			departmentName={schedule.departmentName}
			formatMoment={(instant) => moment.format(new Date(instant))}
			instance={approval.instance}
		/>
	);
	const runAction: Record<ScheduleActionId, () => void> = {
		approve: openPublish,
		approveAndPublish: openPublish,
		publish: openPublish,
		submit: openPublish,
		reject: () => {
			setOpenDialog("reject");
		},
		withdrawApproval: () => {
			setOpenDialog("withdraw");
		},
		withdraw: () => {
			setOpenDialog("withdrawPublication");
		},
		regenerate: () => {
			openRegenerate?.();
		},
		viewSetup: () => {
			void navigate(scheduleSetupLink(schedule));
		},
		details: () => {
			onViewChange({ panel: "details" });
		},
	};
	const notices: Record<ScheduleNoticeId, ReactNode> = {
		weekPublished: weekPublishedBy && (
			<PublishedWeekCallout
				publishedScheduleId={weekPublishedBy}
				stage="blocked"
			/>
		),
		regenerationFailed: (
			<Callout tone="warning">
				{t("scheduling.generation.regenerationFailed", {
					reason: generationFailure(schedule.generation, t).message,
				})}
			</Callout>
		),
		rejected: (
			<RejectedRosterCallout
				rejectedStep={schedule.publication.rejectedAtStep?.stepLabel}
				schedule={schedule}
				showsNextStep={regenerable(schedule)}
			/>
		),
		generating: (
			<Callout>
				{t("scheduling.generation.inProgress", {
					seconds: GENERATION_POLL_INTERVAL_MS / 1000,
				})}
			</Callout>
		),
		failed: (
			<GenerationFailurePanel
				generation={schedule.generation}
				onRegenerate={openRegenerate}
			/>
		),
		draft: <Callout>{t(`${key}.draft`)}</Callout>,
		weekPassed: <Callout>{t(`${key}.weekPassed`)}</Callout>,
		rulesChanged: <Callout>{t(`${key}.rulesChanged`)}</Callout>,
		unpublished: (
			<Callout>
				<Trans
					components={[<strong key="lead" className="font-semibold" />]}
					i18nKey="scheduling.months.roster.unpublished"
				/>
			</Callout>
		),
	};
	// Weeks are published in order: Publish (and Submit, and the last step's Approve) waits for an earlier week.
	const waitsFor = publishWaitsFor(schedule);
	const primaryWaits =
		primary !== undefined &&
		waitsFor !== undefined &&
		actionWaitsForEarlierWeek(primary.id);
	const departmentWeeks = scheduleMonth && {
		weeks: rosterWeeksOf(scheduleMonth, t),
		onWeekChange: (week: string): void => {
			const link = rosterWeekLink(scheduleMonth, week);
			if (link) void navigate(link);
		},
	};
	return (
		<>
			<BackLink departmentId={schedule.departmentId} month={month} />
			{/* Only where an approval is involved: without a flow the page is as before. */}
			{(standing.kind !== "direct" || approval.instance) && (
				<p className="sr-only" role="status">
					{announcement}
				</p>
			)}
			<RosterHeader
				className="mt-4"
				schedule={schedule}
				actions={
					// On a phone the menu sits beside the title and the primary action takes its own row.
					<div className="flex items-center gap-3 max-sm:contents">
						{primary && (
							<div className="flex flex-col items-end gap-2 max-sm:order-last max-sm:w-full">
								<Button
									aria-describedby={primaryWaits ? publishNoteId : undefined}
									className="max-sm:w-full"
									disabled={primaryWaits}
									onClick={runAction[primary.id]}
								>
									{t(primary.labelKey, { month: monthName })}
								</Button>
								{primaryWaits && (
									<p
										className="text-right text-sm text-neutral-700 max-sm:text-left"
										id={publishNoteId}
									>
										{t("scheduling.months.roster.publishFirst", {
											week: formatPeriod(waitsFor, formattingLocale(i18n)),
										})}
									</p>
								)}
							</div>
						)}
						<ScheduleMenu
							withExport
							companyId={companyId}
							schedule={schedule}
							onDeleted={() => {
								void navigate({ to: "/scheduling" });
							}}
						>
							{menu.length > 0 &&
								menu.map((action) => (
									<OverflowMenuItem
										key={action.id}
										onClick={runAction[action.id]}
									>
										{t(action.labelKey, { month: monthName })}
									</OverflowMenuItem>
								))}
						</ScheduleMenu>
					</div>
				}
				meta={
					(metaLine || trail) && (
						<span
							ref={approvalLineRef}
							className="flex flex-wrap items-center gap-x-2 font-normal outline-none"
							tabIndex={-1}
						>
							{metaLine && (
								<span
									className={
										metaLine.key === "approvals.meta.waitingOnYou"
											? "font-medium"
											: undefined
									}
									role={
										metaLine.key === "approvals.meta.failed"
											? "alert"
											: undefined
									}
								>
									{t(metaLine.key, metaLine.values)}
								</span>
							)}
							{metaLine?.key === "approvals.meta.failed" && (
								<Button variant="textlink" onClick={approval.retry}>
									{t("approvals.meta.retry")}
								</Button>
							)}
							{trail && (
								<Button
									aria-label={t("approvals.meta.openLabel")}
									variant="textlink"
									onClick={() => {
										onViewChange({
											...(view.week ? { week: view.week } : {}),
											panel: "approval",
										});
									}}
								>
									{t("approvals.meta.open")}
								</Button>
							)}
						</span>
					)
				}
			/>
			{scheduleNotices(noticeFacts).map((notice) => (
				<div key={notice} className="mt-6">
					{notices[notice]}
				</div>
			))}
			{partLines.length > 0 && (
				<Callout className="mt-6">
					{partLines.map((line) => (
						<span key={line} className="block">
							{line}
						</span>
					))}
					{remaining && permissions.mayCreateHere && (
						<Button
							className="mt-2"
							size="sm"
							to="/scheduling/new"
							variant="secondary"
							search={{
								department: schedule.departmentId,
								for: "dates",
								firstDay: remaining.from,
								lastDay: remaining.to,
							}}
						>
							{t("scheduling.roster.remainingButton", {
								rest: daysText(remaining),
							})}
						</Button>
					)}
				</Callout>
			)}
			{rosterShown(noticeFacts) && (
				<RosterBody
					approval={trail}
					assignments={assignments}
					constraints={readyItems(constraints)}
					departmentWeeks={departmentWeeks}
					editing={editing}
					hours={rosterHours}
					preferenceOutcomes={preferenceOutcomes}
					schedule={schedule}
					shifts={readyItems(shifts)}
					startingContext={startingContext.data}
					validation={mayValidate ? validation : undefined}
					view={view}
					details={scheduleDetailItems(
						schedule,
						(instant) => moment.format(new Date(instant)),
						t
					)}
					onViewChange={onViewChange}
				/>
			)}
			{openDialog === "publish" && (
				<PublishScheduleDialog
					companyId={companyId}
					mode={publishModeOf(standing, approval.instance?.steps ?? [])}
					schedule={schedule}
					onClose={closeDialog}
					onDone={decided}
				/>
			)}
			{openDialog === "reject" && (
				<RejectScheduleDialog
					companyId={companyId}
					schedule={schedule}
					approvalStep={
						standing.kind === "pending"
							? { instanceId: standing.instanceId, step: standing.step }
							: undefined
					}
					onClose={closeDialog}
					onDone={decided}
				/>
			)}
			{openDialog === "withdraw" && standing.kind === "pending" && (
				<WithdrawApprovalDialog
					companyId={companyId}
					instanceId={standing.instanceId}
					onClose={closeDialog}
					onDone={decided}
				/>
			)}
			{openDialog === "withdrawPublication" && (
				<RejectScheduleDialog
					companyId={companyId}
					decision="withdraw"
					schedule={schedule}
					onClose={closeDialog}
				/>
			)}
			{openDialog === "regenerate" && scheduleMonth && (
				<RegenerateMonthDialog
					companyId={companyId}
					month={scheduleMonth}
					onClose={closeDialog}
				/>
			)}
		</>
	);
};

/**
 * One schedule's roster at `/scheduling/$scheduleId`: read from the API by
 * its id, with its generation's progress, failure or roster.
 */
export const ScheduleDetailPage = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { scheduleId } = route.useParams();
	return (
		<>
			<ApiSchedule
				key={`${companyId}/${scheduleId}`}
				companyId={companyId}
				scheduleId={scheduleId}
			/>
		</>
	);
};
