import {
	getRouteApi,
	SearchParamError,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { GeneratedRoster } from "@/features/scheduling/GeneratedRoster";
import { GenerationFailurePanel } from "@/features/scheduling/GenerationFailurePanel";
import type { DepartmentPath } from "@/features/scheduling/paths";
import { RosterHeader } from "@/features/scheduling/RosterHeader";
import {
	generationInProgress,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { scheduleSetupLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { useSchedule } from "@/features/scheduling/schedules/useSchedule";
import {
	useScheduleAssignments,
	type AssignmentList,
} from "@/features/scheduling/schedules/useScheduleAssignments";

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

/**
 * Shown in place of the roster when its route fails: a URL that doesn't name
 * the schedule's Department reads as not found.
 */
export const ScheduleDetailProblem = ({
	error,
}: ErrorComponentProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackLink />
			<Problem alert>
				{t(
					error instanceof SearchParamError
						? `${key}.notFound`
						: `${key}.loadFailed`
				)}
			</Problem>
		</>
	);
};

/**
 * Under the header, by where the schedule stands: being generated, failed,
 * generated with its roster, or still a draft reached by its URL.
 */
const RosterBody = ({
	schedule,
	assignments,
}: {
	schedule: Schedule;
	assignments: AssignmentList;
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
			/>
		);
	if (schedule.status !== "GENERATED")
		return <Callout className="mt-8">{t(`${key}.draft`)}</Callout>;
	if (assignments.status !== "ready")
		return (
			<Problem alert={assignments.status !== "pending"}>
				{t(`${key}.${ROSTER_PROBLEMS[assignments.status]}`)}
			</Problem>
		);
	return (
		<GeneratedRoster assignments={assignments.items} schedule={schedule} />
	);
};

/**
 * One schedule read at the Department its URL names. It is read again every
 * 15 seconds while its generation is in progress; its roster is read once it
 * is GENERATED.
 */
const ApiSchedule = ({
	companyId,
	unit,
	scheduleId,
}: {
	companyId: string;
	unit: DepartmentPath;
	scheduleId: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	const state = useSchedule(companyId, unit, scheduleId, {
		pollWhileGenerating: true,
	});
	const showsRoster =
		state.status === "ready" &&
		state.schedule.status === "GENERATED" &&
		!generationInProgress(state.schedule);
	const assignments = useScheduleAssignments(
		companyId,
		unit,
		scheduleId,
		showsRoster
	);
	if (state.status !== "ready")
		return (
			<Problem alert={state.status !== "pending"}>
				{t(`${key}.${SCHEDULE_PROBLEMS[state.status]}`)}
			</Problem>
		);
	return (
		<>
			<RosterHeader
				className="mt-4"
				schedule={state.schedule}
				actions={
					<Button {...scheduleSetupLink(state.schedule)} variant="textlink">
						{t(`${key}.viewSetup`)}
					</Button>
				}
			/>
			<RosterBody assignments={assignments} schedule={state.schedule} />
		</>
	);
};

/**
 * One schedule's roster at `/scheduling/$scheduleId?branchId=…&departmentId=…`:
 * read from the API at that Department, with its generation's progress,
 * failure or roster.
 */
export const ScheduleDetailPage = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { scheduleId } = route.useParams();
	const unit = route.useSearch();
	return (
		<>
			<BackLink />
			<ApiSchedule
				key={`${companyId}/${scheduleId}`}
				companyId={companyId}
				scheduleId={scheduleId}
				unit={unit}
			/>
		</>
	);
};
