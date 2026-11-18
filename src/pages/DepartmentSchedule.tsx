import { getRouteApi, useRouterState } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
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
import { PublishDaysDialog } from "@/features/scheduling/timeline/PublishDaysDialog";
import { toReviewPiecesOf } from "@/features/scheduling/timeline/rosterStrip";
import { StatusStrip } from "@/features/scheduling/timeline/StatusStrip";
import {
	branchWeekFrom,
	firstFreeRunOf,
	generatingNoticeShown,
	isGeneratingIn,
	needsOf,
	shiftWindow,
	type TimelineSchedule,
	type TimelineView,
	windowDays,
} from "@/features/scheduling/timeline/timeline";
import { TimelineGrid } from "@/features/scheduling/timeline/TimelineGrid";
import { TimelineNeeds } from "@/features/scheduling/timeline/TimelineNeeds";
import { piecesOf } from "@/features/scheduling/timeline/timelineRows";
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

/**
 * On arrival from a run by dates: which days are being generated. It goes
 * once those days were seen being generated and no longer are.
 */
const DatesRunCallout = ({
	schedules,
}: {
	schedules: ReadonlyArray<TimelineSchedule>;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const days = datesRunOf(
		useRouterState({ select: (state) => state.location.state })
	);
	// The run whose days were seen being generated, kept by its days so a later run starts unseen.
	const [seenGeneratingRun, setSeenGeneratingRun] = useState<string>();
	if (!days) return null;
	const run = `${days.from}/${days.to}`;
	const generatingNow = isGeneratingIn(schedules, {
		firstDay: days.from,
		lastDay: days.to,
	});
	// Set while rendering, as a validation's last answer is: the next render finds the run seen.
	if (generatingNow && seenGeneratingRun !== run) setSeenGeneratingRun(run);
	if (!generatingNoticeShown(generatingNow, seenGeneratingRun === run))
		return null;
	return (
		<Callout>
			{t(`${key}.generatingDays`, {
				days: formatPeriod(
					{ start: days.from, end: days.to },
					formattingLocale(i18n)
				),
			})}
		</Callout>
	);
};

/**
 * One Department's roster at `/scheduling/department?department=…`: what
 * needs the manager, then one grid of people by day with the status strip
 * under its dates. The header generates days and publishes the days to review.
 */
export const DepartmentSchedulePage = (): FunctionComponent => {
	const { t } = useTranslation();
	const companyId = useCurrentCompanyId();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const access = useAccess();
	// The schedules a Publish (header or needs list) is asked for; none while no publish dialog is open.
	const [publishing, setPublishing] = useState<ReadonlyArray<string>>();
	const departmentId = search.department ?? "";
	const view = search.view ?? DEFAULT_VIEW;
	// The branch's time zone is known only once read, so the default window starts from the device's week (moved below).
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
	const mayPublish = access.can(
		"schedule:publish",
		departmentScope(departmentId)
	);

	// Once the branch's today is known, a window opened on the device's Monday moves to the branch's (URL replaced).
	const branchFrom =
		timeline.status === "ready" && timeline.timeZone
			? branchWeekFrom(
					search.from,
					firstDay,
					isoDateIn(timeline.timeZone, new Date())
				)
			: undefined;
	useEffect(() => {
		if (branchFrom === undefined) return;
		void navigate({
			search: (previous) => ({ ...previous, from: branchFrom }),
			replace: true,
		});
	}, [branchFrom, navigate]);

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
	const today = timeline.timeZone
		? isoDateIn(timeline.timeZone, new Date())
		: dayjs().format(ISO_DATE_FORMAT);
	const needs = needsOf(timeline.schedules, { firstDay, lastDay }, today);
	const toReviewIds = toReviewPiecesOf(timeline.schedules, {
		firstDay,
		lastDay,
	}).map((piece) => piece.schedule.id);
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
					<div className="flex flex-wrap items-center gap-3">
						{mayPublish && toReviewIds.length > 0 && (
							<Button
								variant="secondary"
								onClick={() => {
									setPublishing(toReviewIds);
								}}
							>
								{t(`${key}.publish`)}
							</Button>
						)}
						{mayCreate && (
							// Opens on the first days with no roster that can be generated, when there are any.
							<Button
								to="/scheduling/new"
								search={{
									department: departmentId,
									for: "dates",
									...firstFreeRunOf(needs),
								}}
							>
								{t(`${key}.createSchedule`)}
							</Button>
						)}
					</div>
				</header>
				<DatesRunCallout schedules={timeline.schedules} />
				<TimelineNeeds
					departmentId={departmentId}
					lines={needs}
					mayCreate={mayCreate}
					onPublish={mayPublish ? setPublishing : undefined}
				/>
				<TimelineToolbar
					firstDay={firstDay}
					view={view}
					onFromChange={(from) => {
						changeSearch({ from });
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
				<TimelineGrid
					days={days}
					rosters={timeline.rosters}
					rows={timeline.rows}
					schedules={timeline.schedules}
					view={view}
					statusRow={
						<StatusStrip
							companyId={companyId}
							days={days}
							departmentId={departmentId}
							pieces={timeline.pieces}
							schedules={timeline.schedules}
							view={view}
						/>
					}
				/>
			</div>
			{publishing && (
				<PublishDaysDialog
					companyId={companyId}
					pieces={piecesOf(timeline.pieces, publishing)}
					onClose={() => {
						setPublishing(undefined);
					}}
				/>
			)}
		</>
	);
};
