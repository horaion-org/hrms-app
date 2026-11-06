import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import {
	GeneratedRoster,
	type GeneratedRosterProps,
	type RosterEditing,
} from "@/features/scheduling/GeneratedRoster";
import { GenerationFailurePanel } from "@/features/scheduling/GenerationFailurePanel";
import type { DepartmentPath } from "@/features/scheduling/paths";
import { PublishScheduleDialog } from "@/features/scheduling/PublishScheduleDialog";
import { RegenerateDialog } from "@/features/scheduling/RegenerateDialog";
import { RejectedRosterCallout } from "@/features/scheduling/RejectedRosterCallout";
import { RejectScheduleDialog } from "@/features/scheduling/RejectScheduleDialog";
import {
	publishedRosterOtherThan,
	publishedWeekQuery,
} from "@/features/scheduling/publishedWeek/api";
import { PublishedWeekCallout } from "@/features/scheduling/publishedWeek/PublishedWeekCallout";
import { dateTimeFormatIn } from "@/features/scheduling/roster/roster";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { RosterHeader } from "@/features/scheduling/RosterHeader";
import { rosterChangeShiftsQuery } from "@/features/scheduling/rosterChanges/api";
import { ScheduleMenu } from "@/features/scheduling/ScheduleMenu";
import {
	decidable,
	generationInProgress,
	hasRoster,
	regenerable,
	rosterEditable,
	rosterRunId,
} from "@/features/scheduling/schedules/api";
import {
	scheduleActions,
	type ScheduleActionId,
} from "@/features/scheduling/schedules/scheduleActions";
import { scheduleDetailItems } from "@/features/scheduling/schedules/scheduleDetails";
import {
	rosterShown,
	scheduleNotices,
	type ScheduleNoticeFacts,
	type ScheduleNoticeId,
} from "@/features/scheduling/schedules/scheduleNotices";
import { scheduleSetupLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { useCompanySchedule } from "@/features/scheduling/schedules/useSchedule";
import {
	useScheduleAssignments,
	type AssignmentList,
} from "@/features/scheduling/schedules/useScheduleAssignments";
import { useScheduleConstraints } from "@/features/scheduling/schedules/useScheduleConstraints";
import { useScheduleShifts } from "@/features/scheduling/schedules/useScheduleShifts";
import {
	startingContextQuery,
	type StartingContext,
} from "@/features/scheduling/startingContext/api";
import { runsByMember } from "@/features/scheduling/startingContext/startingGrid";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

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

const BackLink = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button leadingIcon={<ArrowLeftIcon />} to="/scheduling" variant="textlink">
			{t(`${key}.back`)}
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

/** The roster itself, once the schedule has one: its rows, or why they aren't shown yet. */
const RosterBody = ({
	assignments,
	startingContext,
	...roster
}: Omit<
	GeneratedRosterProps,
	"assignments" | "membersWithChangedStart" | "startingRuns"
> & {
	assignments: AssignmentList;
	/** Where members started the week; undefined until read, or when it can't be. */
	startingContext?: StartingContext;
}): FunctionComponent => {
	const { t } = useTranslation();
	if (assignments.status !== "ready")
		return (
			<Problem alert={assignments.status !== "pending"}>
				{t(`${key}.${ROSTER_PROBLEMS[assignments.status]}`)}
			</Problem>
		);
	return (
		<GeneratedRoster
			{...roster}
			assignments={assignments.items}
			startingRuns={startingContext ? runsByMember(startingContext) : undefined}
			// Only a frozen context can go stale: members whose week before changed since generation.
			membersWithChangedStart={
				startingContext?.frozen === true
					? startingContext.staleMemberProfileIds.length
					: 0
			}
		/>
	);
};

/** The dialog open over the roster, if any. */
type OpenDialog = "publish" | "reject" | "regenerate" | undefined;

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
	const view = route.useSearch();
	const onViewChange = (next: RosterSearch): void => {
		void navigateHere({ search: next, replace: true });
	};
	const access = useAccess();
	const [openDialog, setOpenDialog] = useState<OpenDialog>();
	const closeDialog = (): void => {
		setOpenDialog(undefined);
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
	// The frozen shifts and constraints only name what the findings refer to.
	const rosterSchedule = showsRoster ? state.schedule : undefined;
	const shifts = useScheduleShifts(
		companyId,
		rosterSchedule,
		rosterSchedule?.scheduleId
	);
	const constraints = useScheduleConstraints(companyId, rosterSchedule);
	// A generated roster awaiting its decision, or a published one, may be
	// changed by hand under its own key (hrms-backend-v2 docs/adr/0062, 0063);
	// the editor reads the frozen shifts it offers through that key, so it
	// needs no shift:read.
	const mayEditShifts =
		state.status === "ready" &&
		runId !== undefined &&
		rosterEditable(state.schedule) &&
		access.can(
			"schedule:edit_shift",
			departmentScope(state.schedule.departmentId)
		);
	const editorShifts = useQuery(
		rosterChangeShiftsQuery(companyId, unit, scheduleId, mayEditShifts)
	);
	const startingContext = useQuery(
		startingContextQuery(
			companyId,
			unit,
			scheduleId,
			showsRoster &&
				unit !== undefined &&
				access.can("schedule:read", departmentScope(unit.departmentId))
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
			unit && access.can("schedule:read", departmentScope(unit.departmentId))
				? unit
				: undefined,
			awaitingPublication?.periodStart
		)
	);
	const weekPublishedBy = publishedRosterOtherThan(
		publishedWeek.data,
		scheduleId
	);
	if (state.status !== "ready")
		return (
			<Problem alert={state.status !== "pending"}>
				{t(`${key}.${SCHEDULE_PROBLEMS[state.status]}`)}
			</Problem>
		);
	const openRegenerate =
		regenerable(state.schedule) &&
		weekPublishedBy === undefined &&
		access.can(
			"schedule:generate",
			departmentScope(state.schedule.departmentId)
		)
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
					notifiesMembers: state.schedule.status === "PUBLISHED",
				}
			: undefined;
	const schedule = state.schedule;
	const noticeFacts: ScheduleNoticeFacts = {
		status: schedule.status,
		generating: generationInProgress(schedule),
		hasRoster: hasRoster(schedule),
		weekPublishedElsewhere: weekPublishedBy !== undefined,
	};
	const moment = dateTimeFormatIn(
		i18n.resolvedLanguage ?? i18n.language,
		schedule.timeZone,
		{ dateStyle: "medium", timeStyle: "short" }
	);
	const mayReject =
		decidable(schedule) &&
		access.can("schedule:publish", departmentScope(schedule.departmentId));
	const { primary, menu } = scheduleActions({
		status: schedule.status,
		mayPublish: mayReject && weekPublishedBy === undefined,
		mayReject,
		mayRegenerate: openRegenerate !== undefined,
		hasRoster: rosterShown(noticeFacts),
	});
	const runAction: Record<ScheduleActionId, () => void> = {
		publish: () => {
			setOpenDialog("publish");
		},
		reject: () => {
			setOpenDialog("reject");
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
		rejected: (
			<RejectedRosterCallout
				schedule={schedule}
				showsNextStep={regenerable(schedule)}
			/>
		),
		generating: <Callout>{t("scheduling.generation.inProgress")}</Callout>,
		failed: (
			<GenerationFailurePanel
				generation={schedule.generation}
				onRegenerate={openRegenerate}
			/>
		),
		draft: <Callout>{t(`${key}.draft`)}</Callout>,
	};
	return (
		<>
			<RosterHeader
				className="mt-4"
				schedule={schedule}
				actions={
					<div className="flex items-center gap-3">
						{primary && (
							<Button onClick={runAction[primary.id]}>
								{t(primary.labelKey)}
							</Button>
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
										{t(action.labelKey)}
									</OverflowMenuItem>
								))}
						</ScheduleMenu>
					</div>
				}
			/>
			{scheduleNotices(noticeFacts).map((notice) => (
				<div key={notice} className="mt-6">
					{notices[notice]}
				</div>
			))}
			{rosterShown(noticeFacts) && (
				<RosterBody
					assignments={assignments}
					constraints={readyItems(constraints)}
					editing={editing}
					schedule={schedule}
					shifts={readyItems(shifts)}
					startingContext={startingContext.data}
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
					schedule={schedule}
					onClose={closeDialog}
				/>
			)}
			{openDialog === "reject" && (
				<RejectScheduleDialog
					companyId={companyId}
					schedule={schedule}
					onClose={closeDialog}
				/>
			)}
			{openDialog === "regenerate" && (
				<RegenerateDialog
					companyId={companyId}
					schedule={schedule}
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
			<BackLink />
			<ApiSchedule
				key={`${companyId}/${scheduleId}`}
				companyId={companyId}
				scheduleId={scheduleId}
			/>
		</>
	);
};
