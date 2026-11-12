import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import {
	ArrowLeftIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@/components/ui/Icon";
import {
	scheduleMonthQuery,
	type ScheduleMonth,
} from "@/features/scheduling/months/api";
import { isMonth } from "@/features/scheduling/months/monthSearch";
import {
	crossingWeekOf,
	formatDayAndMonth,
	formatMonth,
	formatMonthName,
	formatWeekDates,
	monthOf,
	shiftMonth,
} from "@/features/scheduling/months/monthWeeks";
import { stateCountsLine } from "@/features/scheduling/months/monthCopy";
import { WeekCard } from "@/features/scheduling/months/WeekCard";
import { dayMarkLooks } from "@/features/scheduling/months/weekStateLooks";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

const route = getRouteApi("/_authenticated/_app/scheduling_/months/$month");

const key = "scheduling.months.page";

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
			{t("scheduling.overview.title")}
		</Button>
	);
};

/** A line saying why the month isn't shown; an alert unless it is still loading. */
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

/** Shown in place of the month when its route fails. */
export const ScheduleMonthProblem = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackLink />
			<Problem alert>{t(`${key}.loadFailed`)}</Problem>
		</>
	);
};

/** "‹ October" and "December ›": the neighbouring months of the same Department. */
const MonthSteps = ({
	month,
	department,
}: {
	month: string;
	department: string;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const previous = shiftMonth(month, -1);
	const next = shiftMonth(month, 1);
	return (
		<div className="flex flex-wrap gap-2">
			<Button
				leadingIcon={<ChevronLeftIcon />}
				params={{ month: previous }}
				search={{ department }}
				to="/scheduling/months/$month"
				variant="secondary"
				aria-label={t(`${key}.previousMonth`, {
					month: formatMonth(previous, language),
				})}
			>
				{formatMonthName(previous, language)}
			</Button>
			<Button
				params={{ month: next }}
				search={{ department }}
				to="/scheduling/months/$month"
				trailingIcon={<ChevronRightIcon />}
				variant="secondary"
				aria-label={t(`${key}.nextMonth`, {
					month: formatMonth(next, language),
				})}
			>
				{formatMonthName(next, language)}
			</Button>
		</div>
	);
};

/** The week of the month before that ends in this month: shown once, on its Monday's month, with a link there. */
const CrossingWeekLine = ({
	month,
	department,
}: {
	month: string;
	department: string;
}): FunctionComponent => {
	const { i18n } = useTranslation();
	const week = crossingWeekOf(month);
	if (!week) return null;
	const language = formattingLocale(i18n);
	const weekMonth = monthOf(week.start);
	return (
		<p className="text-sm text-neutral-800">
			<Trans
				i18nKey={`${key}.crossingWeek`}
				components={[
					<Button
						key="month"
						params={{ month: weekMonth }}
						search={{ department }}
						to="/scheduling/months/$month"
						variant="textlink"
					/>,
				]}
				values={{
					week: formatWeekDates(week, language),
					month: formatMonthName(weekMonth, language),
				}}
			/>
		</p>
	);
};

/** The two day marks and what publishing means for staff. */
const Legend = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-2 text-sm text-neutral-800">
			<ul className="flex flex-wrap gap-x-6 gap-y-2">
				<li className="flex items-center gap-2">
					<span aria-hidden="true" className={dayMarkLooks.covered} />
					{t(`${key}.legendCovered`)}
				</li>
				<li className="flex items-center gap-2">
					<span aria-hidden="true" className={dayMarkLooks.short} />
					{t(`${key}.legendShort`)}
				</li>
			</ul>
			<p>{t(`${key}.footnote`)}</p>
		</div>
	);
};

/** The month itself: its title and summary, its weeks, and the legend. */
const MonthContent = ({
	scheduleMonth,
}: {
	scheduleMonth: ScheduleMonth;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const { month, departmentId, departmentName, weeks } = scheduleMonth;
	const first = weeks[0];
	const last = weeks[weeks.length - 1];
	const noSchedule = weeks.every((week) => week.scheduleId === null);
	const counts = stateCountsLine(weeks, t);
	const summary = [
		first &&
			last &&
			t(`${key}.weeks`, {
				count: weeks.length,
				from: formatDayAndMonth(first.periodStart, language),
				to: formatDayAndMonth(last.periodEnd, language),
			}),
		counts && `${counts}.`,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className="mt-4 flex flex-col gap-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="flex min-w-0 flex-col gap-2">
					<h1 className="text-4xl font-medium text-neutral-900">
						{t(`${key}.title`, {
							department: departmentName,
							month: formatMonth(month, language),
						})}
					</h1>
					<p className="text-sm text-neutral-800">{summary}</p>
				</div>
				<MonthSteps department={departmentId} month={month} />
			</header>
			<CrossingWeekLine department={departmentId} month={month} />
			{noSchedule && (
				<p className="text-sm text-neutral-800">
					{t(`${key}.noSchedule`, { month: formatMonth(month, language) })}
				</p>
			)}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{weeks.map((week) => (
					<WeekCard
						key={week.periodStart}
						departmentId={departmentId}
						week={week}
					/>
				))}
			</div>
			<Legend />
		</div>
	);
};

/** A 404: the Department is out of reach or gone. */
const isNotFound = (error: unknown): boolean =>
	error instanceof ApiProblemError && error.status === 404;

/** The month once read, or why it isn't shown: unreadable or out of reach, loading, or failed. */
const MonthBody = ({
	query,
}: {
	query: UseQueryResult<ScheduleMonth> | undefined;
}): FunctionComponent => {
	const { t } = useTranslation();
	if (!query || isNotFound(query.error))
		return <Problem alert>{t(`${key}.unavailable`)}</Problem>;
	if (query.isPending)
		return <Problem alert={false}>{t(`${key}.loading`)}</Problem>;
	if (query.isError) return <Problem alert>{t(`${key}.loadFailed`)}</Problem>;
	return <MonthContent scheduleMonth={query.data} />;
};

/**
 * One Department's month at `/scheduling/months/$month?department=…`: its
 * weeks in Monday order, each with its state, cover and one action.
 */
export const ScheduleMonthPage = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { month } = route.useParams();
	const { department } = route.useSearch();
	const access = useAccess();
	const readable =
		access.canAnywhere("schedule:read") &&
		isMonth(month) &&
		department !== undefined;
	const query = useQuery(
		scheduleMonthQuery(companyId, department ?? "", month, readable)
	);

	return (
		<>
			<BackLink department={department} />
			<MonthBody query={readable ? query : undefined} />
		</>
	);
};
