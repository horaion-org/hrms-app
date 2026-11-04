import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { GeneratedRoster } from "@/features/scheduling/GeneratedRoster";
import { GenerationFailurePanel } from "@/features/scheduling/GenerationFailurePanel";
import type { DepartmentPath } from "@/features/scheduling/paths";
import { PublishScheduleDialog } from "@/features/scheduling/PublishScheduleDialog";
import { RegenerateDialog } from "@/features/scheduling/RegenerateDialog";
import { RejectScheduleDialog } from "@/features/scheduling/RejectScheduleDialog";
import { RosterHeader } from "@/features/scheduling/RosterHeader";
import { ScheduleDecisionPanel } from "@/features/scheduling/ScheduleDecisionPanel";
import { ScheduleMenu } from "@/features/scheduling/ScheduleMenu";
import {
	decidable,
	generationInProgress,
	hasRoster,
	regenerable,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { scheduleSetupLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { useCompanySchedule } from "@/features/scheduling/schedules/useSchedule";
import {
	useScheduleAssignments,
	type AssignmentList,
} from "@/features/scheduling/schedules/useScheduleAssignments";
import {
	useScheduleConstraints,
	type ConstraintList,
} from "@/features/scheduling/schedules/useScheduleConstraints";
import {
	useScheduleShifts,
	type ShiftList,
} from "@/features/scheduling/schedules/useScheduleShifts";
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

/**
 * Under the header, by where the schedule stands: being generated, failed,
 * generated with its roster, or still a draft reached by its URL.
 */
const RosterBody = ({
	schedule,
	assignments,
	shifts,
	constraints,
	startingContext,
	onRegenerate,
}: {
	schedule: Schedule;
	assignments: AssignmentList;
	shifts: ShiftList;
	constraints: ConstraintList;
	/** Where members started the week; undefined until read, or when it can't be. */
	startingContext?: StartingContext;
	/** Left out when the schedule can't be generated again by this person. */
	onRegenerate?: () => void;
}): FunctionComponent => {
	const { t } = useTranslation();
	if (generationInProgress(schedule))
		return (
			<Callout className="mt-8">
				{t("scheduling.generation.inProgress")}
			</Callout>
		);
	if (schedule.status === "GENERATION_FAILED")
		return (
			<GenerationFailurePanel
				className="mt-8"
				generation={schedule.generation}
				onRegenerate={onRegenerate}
			/>
		);
	if (!hasRoster(schedule))
		return <Callout className="mt-8">{t(`${key}.draft`)}</Callout>;
	if (assignments.status !== "ready")
		return (
			<Problem alert={assignments.status !== "pending"}>
				{t(`${key}.${ROSTER_PROBLEMS[assignments.status]}`)}
			</Problem>
		);
	const stale =
		startingContext?.frozen === true
			? startingContext.staleMemberProfileIds.length
			: 0;
	return (
		<>
			{stale > 0 && (
				<Callout className="mt-8" tone="warning">
					{t("scheduling.startingContext.stale", { count: stale })}
				</Callout>
			)}
			<GeneratedRoster
				assignments={assignments.items}
				constraints={readyItems(constraints)}
				schedule={schedule}
				shifts={readyItems(shifts)}
				startingRuns={
					startingContext ? runsByMember(startingContext) : undefined
				}
			/>
		</>
	);
};

/** The decision dialog open on the roster, if any. */
type Deciding = "publish" | "reject" | undefined;

/**
 * One schedule read by its id alone. It is read again every
 * 15 seconds while its generation is in progress; its roster, and the frozen
 * shifts and constraints that name its findings, are read once it has one
 * (generated, published or rejected). Where the person may, its header
 * offers to regenerate a generation that ended and wasn't published (as does
 * the failure panel) and to delete it, and the decision panel under the
 * header offers to publish or reject a generated roster.
 */
const ApiSchedule = ({
	companyId,
	scheduleId,
}: {
	companyId: string;
	scheduleId: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const access = useAccess();
	const [regenerating, setRegenerating] = useState(false);
	const [deciding, setDeciding] = useState<Deciding>();
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
	const showsRoster =
		state.status === "ready" &&
		hasRoster(state.schedule) &&
		!generationInProgress(state.schedule);
	const assignments = useScheduleAssignments(
		companyId,
		unit,
		scheduleId,
		showsRoster
	);
	// The frozen shifts and constraints only name what the findings refer to.
	const rosterSchedule = showsRoster ? state.schedule : undefined;
	const shifts = useScheduleShifts(
		companyId,
		rosterSchedule,
		rosterSchedule?.scheduleId
	);
	const constraints = useScheduleConstraints(companyId, rosterSchedule);
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
	if (state.status !== "ready")
		return (
			<Problem alert={state.status !== "pending"}>
				{t(`${key}.${SCHEDULE_PROBLEMS[state.status]}`)}
			</Problem>
		);
	const openRegenerate =
		regenerable(state.schedule) &&
		access.can(
			"schedule:generate",
			departmentScope(state.schedule.departmentId)
		)
			? (): void => {
					setRegenerating(true);
				}
			: undefined;
	const canDecide =
		decidable(state.schedule) &&
		access.can(
			"schedule:publish",
			departmentScope(state.schedule.departmentId)
		);
	return (
		<>
			<RosterHeader
				className="mt-4"
				schedule={state.schedule}
				actions={
					<div className="flex items-center gap-4">
						<Button {...scheduleSetupLink(state.schedule)} variant="textlink">
							{t(`${key}.viewSetup`)}
						</Button>
						{openRegenerate && (
							<Button size="sm" variant="secondary" onClick={openRegenerate}>
								{t("scheduling.regenerate.button")}
							</Button>
						)}
						<ScheduleMenu
							withExport
							companyId={companyId}
							schedule={state.schedule}
							onDeleted={() => {
								void navigate({ to: "/scheduling" });
							}}
						/>
					</div>
				}
			/>
			<ScheduleDecisionPanel
				className="mt-6"
				schedule={state.schedule}
				showsNextStep={regenerable(state.schedule)}
				onPublish={
					canDecide
						? (): void => {
								setDeciding("publish");
							}
						: undefined
				}
				onReject={
					canDecide
						? (): void => {
								setDeciding("reject");
							}
						: undefined
				}
			/>
			<RosterBody
				assignments={assignments}
				constraints={constraints}
				schedule={state.schedule}
				shifts={shifts}
				startingContext={startingContext.data}
				onRegenerate={openRegenerate}
			/>
			{deciding === "publish" && (
				<PublishScheduleDialog
					companyId={companyId}
					schedule={state.schedule}
					onClose={() => {
						setDeciding(undefined);
					}}
				/>
			)}
			{deciding === "reject" && (
				<RejectScheduleDialog
					companyId={companyId}
					schedule={state.schedule}
					onClose={() => {
						setDeciding(undefined);
					}}
				/>
			)}
			{regenerating && (
				<RegenerateDialog
					companyId={companyId}
					schedule={state.schedule}
					onClose={() => {
						setRegenerating(false);
					}}
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
