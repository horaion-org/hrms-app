import { getRouteApi, useRouterState } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { datesRunOf } from "@/features/scheduling/months/datesRunState";
import { formatPeriod } from "@/features/scheduling/periods";
import { isoDateIn } from "@/features/scheduling/roster/roster";
import {
	needsOf,
	shiftWindow,
	shownScheduleIn,
	type TimelineSchedule,
	type TimelineView,
	windowDays,
} from "@/features/scheduling/timeline/timeline";
import { TimelineGrid } from "@/features/scheduling/timeline/TimelineGrid";
import { TimelineNeeds } from "@/features/scheduling/timeline/TimelineNeeds";
import { TimelineToolbar } from "@/features/scheduling/timeline/TimelineToolbar";
import { useDepartmentTimeline } from "@/features/scheduling/timeline/useDepartmentTimeline";
import { SCHEDULE_CREATE_KEYS } from "@/features/workspace/permissionKeys";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

const route = getRouteApi("/_authenticated/_app/scheduling_/department");

const key = "scheduling.timeline";

/** The view shown when the URL names none. */
const DEFAULT_VIEW: TimelineView = "week";

/** Back to the Scheduling page, keeping the Department the person came from. */
const BackLink = ({
	department,
}: {
	department?: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button
			leadingIcon={<ArrowLeftIcon />}
			search={department === undefined ? {} : { department }}
			to="/scheduling"
			variant="textlink"
		>
			{t(`${key}.backLink`)}
		</Button>
	);
};

/** A line saying why the timeline isn't shown; an alert unless it is still loading. */
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

/** Shown in place of the timeline when its route fails. */
export const DepartmentScheduleProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackLink />
			<Problem alert>{t(`${key}.loadFailed`)}</Problem>
		</>
	);
};

/** On arrival from a run by dates: which days are being generated, in the month page's words. */
const DatesRunCallout = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const days = datesRunOf(
		useRouterState({ select: (state) => state.location.state })
	);
	if (!days) return null;
	return (
		<Callout>
			{t("scheduling.months.page.datesRun.generating", {
				days: formatPeriod(
					{ start: days.from, end: days.to },
					formattingLocale(i18n)
				),
			})}
		</Callout>
	);
};

/** With one schedule shown alone: which, a way to its page and back to all; otherwise the unpublished ones named. */
const TimelineNotice = ({
	schedules,
	shownScheduleId,
	onShowAll,
}: {
	schedules: ReadonlyArray<TimelineSchedule>;
	shownScheduleId?: string;
	onShowAll: () => void;
}): FunctionComponent => {
	const { t } = useTranslation();
	const shown = schedules.find((schedule) => schedule.id === shownScheduleId);
	if (shown)
		return (
			<Callout tone="neutral">
				<span className="flex flex-wrap items-center gap-3">
					<span>{t(`${key}.notice.showingOne`, { name: shown.name })}</span>
					<Button
						params={{ scheduleId: shown.id }}
						size="sm"
						to="/scheduling/$scheduleId"
						variant="secondary"
					>
						{t(`${key}.notice.openSchedule`)}
					</Button>
					<Button size="sm" variant="secondary" onClick={onShowAll}>
						{t(`${key}.notice.showAll`)}
					</Button>
				</span>
			</Callout>
		);
	const unpublished = schedules.filter(
		(schedule) => schedule.status !== "PUBLISHED"
	);
	if (unpublished.length === 0) return null;
	return (
		<Callout tone="info">
			{t(`${key}.notice.unpublished`, {
				names: unpublished.map((schedule) => schedule.name).join(", "),
			})}
		</Callout>
	);
};

/**
 * One Department's schedules at `/scheduling/department?department=…`: bars
 * over the day columns, one grid of people by day built from all of them,
 * and what needs the manager.
 */
export const DepartmentSchedulePage = (): FunctionComponent => {
	const { t } = useTranslation();
	const companyId = useCurrentCompanyId();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const access = useAccess();
	const departmentId = search.department ?? "";
	const view = search.view ?? DEFAULT_VIEW;
	// The branch's time zone is known only once read, so the default window starts from the device's week.
	const firstDay = search.from ?? mondayOf(dayjs().toDate());
	const days = windowDays(firstDay, view);
	const lastDay = days[days.length - 1]!;
	const timeline = useDepartmentTimeline(
		companyId,
		departmentId,
		firstDay,
		lastDay
	);
	const mayCreate = access.canAll(
		SCHEDULE_CREATE_KEYS,
		departmentScope(departmentId)
	);

	/** Changes the given search keys, keeping the rest. */
	const changeSearch = (change: Partial<typeof search>): void => {
		void navigate({ search: (previous) => ({ ...previous, ...change }) });
	};

	if (search.department === undefined || timeline.status === "hidden")
		return (
			<>
				<BackLink />
				<Problem alert>{t(`${key}.unavailable`)}</Problem>
			</>
		);
	if (timeline.status !== "ready")
		return (
			<>
				<BackLink department={departmentId} />
				{timeline.status === "pending" ? (
					<Problem alert={false}>{t(`${key}.loading`)}</Problem>
				) : (
					<Problem alert>{t(`${key}.loadFailed`)}</Problem>
				)}
			</>
		);
	// A `schedule=` naming no schedule in the window (the window moved on) counts as none, everywhere below.
	const shownScheduleId = shownScheduleIn(timeline.schedules, search.schedule);
	const today = timeline.timeZone
		? isoDateIn(timeline.timeZone, new Date())
		: dayjs().format(ISO_DATE_FORMAT);
	return (
		<>
			<BackLink department={departmentId} />
			<div className="mt-4 flex flex-col gap-6">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex min-w-0 flex-col gap-2">
						<h1 className="text-4xl font-medium text-neutral-900">
							{t(`${key}.title`, { department: timeline.departmentName })}
						</h1>
						<p className="text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
					</div>
					{mayCreate && (
						<Button
							search={{ department: departmentId, for: "dates" }}
							to="/scheduling/new"
						>
							{t(`${key}.createSchedule`)}
						</Button>
					)}
				</header>
				<DatesRunCallout />
				<TimelineToolbar
					firstDay={firstDay}
					schedules={timeline.schedules}
					shownScheduleId={shownScheduleId}
					view={view}
					onFromChange={(from) => {
						changeSearch({ from });
					}}
					onScheduleChange={(schedule) => {
						changeSearch({ schedule });
					}}
					onStep={(step) => {
						changeSearch({ from: shiftWindow(firstDay, view, step) });
					}}
					onToday={() => {
						changeSearch({ from: mondayOf(today) });
					}}
					onViewChange={(nextView) => {
						changeSearch({ view: nextView });
					}}
				/>
				<TimelineNotice
					schedules={timeline.schedules}
					shownScheduleId={shownScheduleId}
					onShowAll={() => {
						changeSearch({ schedule: undefined });
					}}
				/>
				<TimelineGrid
					days={days}
					rosters={timeline.rosters}
					rows={timeline.rows}
					schedules={timeline.schedules}
					shownScheduleId={shownScheduleId}
					view={view}
					onShowOnly={(schedule) => {
						changeSearch({ schedule });
					}}
				/>
				<TimelineNeeds
					departmentId={departmentId}
					lines={needsOf(timeline.schedules, { firstDay, lastDay }, today)}
					mayCreate={mayCreate}
					onReview={(schedule) => {
						changeSearch({ schedule });
					}}
				/>
			</div>
		</>
	);
};
