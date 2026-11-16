import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { matchesSearch } from "@/common/matchesSearch";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon, ViewIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { myPendingApprovalsQuery } from "@/features/approvals/api";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	scheduleMonthSummariesQuery,
	type ScheduleMonthSummary,
} from "@/features/scheduling/months/api";
import { MonthCard } from "@/features/scheduling/months/MonthCard";
import {
	earlierReviewMonth,
	formatMonth,
	summariesByMonth,
	summaryRange,
} from "@/features/scheduling/months/monthWeeks";
import { formatPeriod } from "@/features/scheduling/periods";
import { ScheduleMenu } from "@/features/scheduling/ScheduleMenu";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { statusLabelKey } from "@/features/scheduling/schedules/publishOrder";
import { scheduleStatusTones } from "@/features/scheduling/schedules/scheduleStatusTones";
import { scheduleViewLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { useSchedules } from "@/features/scheduling/schedules/useSchedules";
import { schedulingNoticeFrom } from "@/features/scheduling/schedulingNotice";
import { Can } from "@/features/workspace/Can";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips } from "@/features/workspace/filterChips";
import {
	offersDepartmentChoice,
	selectedUnits,
	type ResolvedUnitSelection,
} from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";

const key = "scheduling.overview";

const matches = (schedule: Schedule, search: string): boolean =>
	matchesSearch(schedule.name, search) ||
	matchesSearch(schedule.departmentName, search);

/** A month card matches the search by its Department's name, as a history row does. */
const monthMatches = (summary: ScheduleMonthSummary, search: string): boolean =>
	matchesSearch(summary.departmentName, search);

export type SchedulesTabProps = {
	companyId: string;
	/** The header's Branch and the Department chosen in the Filters. */
	units: ResolvedUnitSelection;
	/** Writes the chosen Department to the URL; undefined for every Department. */
	onDepartmentChange: (department: string | undefined) => void;
};

/**
 * One section per month, from this week's month to 12 months ahead, with a
 * card per Department that has a schedule in it, then the history of every
 * accessible schedule; both in the header's Branch, narrowed to a
 * Department from the Filters. The search stays on the tab.
 */
export const SchedulesTab = ({
	companyId,
	units,
	onDepartmentChange,
}: SchedulesTabProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const notice = schedulingNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);
	const [dismissed, setDismissed] = useState(false);
	const language = formattingLocale(i18n);
	const access = useAccess();
	const list = useSchedules(companyId, selectedUnits(units));
	const months = useQuery(
		scheduleMonthSummariesQuery(
			companyId,
			selectedUnits(units),
			summaryRange(new Date()),
			access.canAnywhere("schedule:read")
		)
	);
	// What waits on the caller, so a month card can say "Waiting on you"; asked only of possible approvers.
	const waitingOnMe = useQuery(
		myPendingApprovalsQuery(companyId, access.canAnywhere("approval:decide"))
	).data;
	const [search, setSearch] = useState("");
	// The Branch is the header's scope; the Department is the one filter.
	const chips = departmentChips(
		units,
		() => {
			onDepartmentChange(undefined);
		},
		t
	);
	const history =
		list.status === "ready"
			? list.schedules.filter((schedule) => matches(schedule, search))
			: [];
	const columns = useMemo((): Array<DataTableColumn<Schedule>> => {
		const periodOf = (schedule: Schedule): string =>
			formatPeriod(
				{ start: schedule.periodStart, end: schedule.periodEnd },
				language
			);
		const createdAt = new Intl.DateTimeFormat(language, {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		});
		return [
			{
				// A schedule is named by its week, in the reader's language; the stored name is the API's.
				id: "date",
				header: t(`${key}.history.date`),
				cell: (schedule) => periodOf(schedule),
				cellClassName: "font-semibold",
				sortValue: (schedule) => schedule.periodStart,
				pin: "start",
			},
			{
				id: "name",
				header: t(`${key}.history.name`),
				cell: (schedule) => schedule.name,
				// A phone keeps the week and the actions as columns; the rest reads on the week's line, as Job titles does.
				hideBelow: "md",
			},
			{
				id: "createdAt",
				header: t(`${key}.history.createdAt`),
				cell: (schedule) => (
					<time dateTime={schedule.createdAt}>
						{createdAt.format(new Date(schedule.createdAt))}
					</time>
				),
				sortValue: (schedule) => schedule.createdAt,
				hideBelow: "md",
			},
			{
				id: "status",
				header: t(`${key}.history.status`),
				cell: (schedule) => (
					<Badge tone={scheduleStatusTones[schedule.status]}>
						{t(statusLabelKey(schedule.status))}
					</Badge>
				),
				sortValue: (schedule) => t(statusLabelKey(schedule.status)),
				hideBelow: "md",
			},
			{
				id: "department",
				header: t(`${key}.history.department`),
				cell: (schedule) => schedule.departmentName,
				hideBelow: "md",
			},
			{
				id: "actions",
				header: t(`${key}.history.actions`),
				headerClassName: "w-30",
				pin: "end",
				cell: (schedule) => (
					<div className="flex justify-center">
						<Button
							{...scheduleViewLink(schedule)}
							variant="icon"
							aria-label={t(`${key}.viewNamed`, {
								department: schedule.departmentName,
								period: periodOf(schedule),
							})}
						>
							<ViewIcon />
						</Button>
						<ScheduleMenu companyId={companyId} schedule={schedule} />
					</div>
				),
			},
		];
	}, [t, language, companyId]);
	const summaries = months.data ?? [];
	const monthGroups = summariesByMonth(
		summaries.filter((summary) => monthMatches(summary, search))
	);

	return (
		<>
			<ListToolbar
				chips={chips}
				className="mt-6"
				search={search}
				searchLabel={t(`${key}.search`)}
				actions={
					<Can at="anywhere" permission="schedule:create">
						<Button leadingIcon={<PlusIcon />} to="/scheduling/new">
							{t(`${key}.createSchedule`)}
						</Button>
					</Can>
				}
				filterFields={
					// Scheduling has no status filter: with no Department to choose, no Filters.
					offersDepartmentChoice(units) && (
						<DepartmentFilter selection={units} onChange={onDepartmentChange} />
					)
				}
				onSearchChange={setSearch}
				onClearFilters={() => {
					onDepartmentChange(undefined);
				}}
			/>
			{months.isLoading && (
				<p className="mt-8 text-sm text-neutral-700" role="status">
					{t("scheduling.months.tabLoading")}
				</p>
			)}
			{months.isError && (
				<p className="mt-8 text-sm text-neutral-700" role="alert">
					{t("scheduling.months.tabFailed")}
				</p>
			)}
			{months.isSuccess && search.trim() === "" && monthGroups.length === 0 && (
				<p className="mt-8 text-sm text-neutral-700">
					{t("scheduling.months.tabEmpty")}
				</p>
			)}
			{monthGroups.map(([month, monthSummaries]) => (
				<section
					key={month}
					aria-labelledby={`month-${month}`}
					className="mt-12"
				>
					<h2
						className="text-2xl font-semibold text-neutral-900"
						id={`month-${month}`}
					>
						{formatMonth(month, language)}
					</h2>
					<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
						{monthSummaries.map((summary) => (
							<MonthCard
								key={summary.departmentId}
								reviewMonth={earlierReviewMonth(summaries, summary)}
								summary={summary}
								waitingOnMe={waitingOnMe ?? []}
							/>
						))}
					</div>
				</section>
			))}
			<section aria-labelledby="schedule-history" className="mt-16">
				<h2
					className="text-2xl font-semibold text-neutral-900"
					id="schedule-history"
				>
					{t(`${key}.history.title`)}
				</h2>
				<p className="mt-2 text-sm text-neutral-800">
					{t(`${key}.history.description`)}
				</p>
				{list.status !== "ready" ? (
					<p
						className="mt-8 text-sm text-neutral-700"
						role={list.status === "error" ? "alert" : "status"}
					>
						{t(`${key}.${list.status}`)}
					</p>
				) : (
					<DataTable
						className="mt-8"
						columns={columns}
						data={history}
						getRowId={(schedule) => schedule.scheduleId}
						label={t(`${key}.history.title`)}
						emptyState={t(
							`${key}.${search.trim() || chips.length > 0 ? "noMatch" : "empty"}`
						)}
					/>
				)}
			</section>
			{notice && !dismissed && (
				<Toast
					onDismiss={() => {
						setDismissed(true);
					}}
				>
					{t("scheduling.overview.generated", { name: notice.name })}
				</Toast>
			)}
		</>
	);
};
