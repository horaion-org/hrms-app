import { useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon, ViewIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { schedulingNoticeFrom } from "@/features/scheduling/schedulingNotice";
import { Can } from "@/features/workspace/Can";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import { formatPeriod } from "@/features/scheduling/periods";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useSchedules } from "@/features/scheduling/schedules/useSchedules";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import { exampleSchedules } from "@/features/scheduling/schedules";

const key = "scheduling.overview";

const matches = (schedule: Schedule, search: string): boolean => {
	const text = search.trim().toLocaleLowerCase();
	return (
		text === "" ||
		schedule.name.toLocaleLowerCase().includes(text) ||
		schedule.departmentName.toLocaleLowerCase().includes(text)
	);
};

/** Dashboard cards and history from the company's accessible schedules. */
export const Scheduling = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const notice = schedulingNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);
	const [dismissed, setDismissed] = useState(false);
	const language = i18n.resolvedLanguage ?? i18n.language;
	const list = useSchedules(useCurrentCompanyId());
	const [search, setSearch] = useState("");
	const [originalCard] = useState(
		() => exampleSchedules(new Date()).current[0]
	);
	const history =
		list.status === "ready"
			? list.schedules.filter((schedule) => matches(schedule, search))
			: [];
	const columns = useMemo((): Array<DataTableColumn<Schedule>> => {
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
				id: "name",
				header: t(`${key}.history.name`),
				cell: (schedule) => schedule.name,
				cellClassName: "font-semibold",
			},
			{
				id: "date",
				header: t(`${key}.history.date`),
				cell: (schedule) =>
					formatPeriod(
						{ start: schedule.periodStart, end: schedule.periodEnd },
						language
					),
				sortValue: (schedule) => schedule.periodStart,
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
			},
			{
				id: "status",
				header: t(`${key}.history.status`),
				cell: (schedule) => (
					<Badge tone={schedule.status === "DRAFT" ? "neutral" : "warning"}>
						{t(`${key}.statuses.${schedule.status}`)}
					</Badge>
				),
				sortValue: (schedule) => t(`${key}.statuses.${schedule.status}`),
			},
			{
				id: "department",
				header: t(`${key}.history.department`),
				cell: (schedule) => schedule.departmentName,
			},
			{
				id: "actions",
				header: t(`${key}.history.actions`),
				headerClassName: "w-30",
				cell: (schedule) => (
					<div className="flex justify-center">
						<Button
							aria-label={t(`${key}.viewNamed`, { code: schedule.name })}
							to="/scheduling/new"
							variant="icon"
							search={{
								step: "setup",
								scheduleId: schedule.scheduleId,
								departmentId: schedule.departmentId,
							}}
						>
							<ViewIcon />
						</Button>
					</div>
				),
			},
		];
	}, [t, language]);
	const periods = new Map<string, Array<Schedule>>();
	for (const schedule of history) {
		const periodKey = `${schedule.periodStart}/${schedule.periodEnd}`;
		const group = periods.get(periodKey) ?? [];
		group.push(schedule);
		periods.set(periodKey, group);
	}
	const groups = [...periods.entries()].sort(([a], [b]) => b.localeCompare(a));

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t(`${key}.title`)}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			<ListToolbar
				className="mt-10"
				search={search}
				searchLabel={t(`${key}.search`)}
				actions={
					<Can at="anywhere" permission="schedule:create">
						<Button leadingIcon={<PlusIcon />} to="/scheduling/new">
							{t(`${key}.createSchedule`)}
						</Button>
					</Can>
				}
				onSearchChange={setSearch}
			/>
			{originalCard && (
				<section aria-labelledby="original-card-preview" className="mt-12">
					<h2
						className="text-2xl font-semibold text-neutral-900"
						id="original-card-preview"
					>
						{t(`${key}.originalCard`)}
					</h2>
					<p className="mt-2 text-sm text-neutral-700">
						{t(`${key}.originalCardDescription`)}
					</p>
					<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
						<ScheduleCard schedule={originalCard} />
					</div>
				</section>
			)}
			{groups.map(([periodKey, schedules]) => (
				<section
					key={periodKey}
					aria-labelledby={`period-${periodKey}`}
					className="mt-12"
				>
					<h2
						className="text-2xl font-semibold text-neutral-900"
						id={`period-${periodKey}`}
					>
						{formatPeriod(
							{
								start: schedules[0]!.periodStart,
								end: schedules[0]!.periodEnd,
							},
							language
						)}
					</h2>
					<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
						{schedules.map((schedule) => (
							<ScheduleCard
								key={schedule.scheduleId}
								details={schedule}
								schedule={{
									scheduleId: schedule.scheduleId,
									departmentId: schedule.departmentId,
									departmentName: schedule.departmentName,
									code: schedule.name,
									period: {
										start: schedule.periodStart,
										end: schedule.periodEnd,
									},
									status: schedule.status,
									createdAt: schedule.createdAt,
								}}
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
						emptyState={t(`${key}.${search.trim() ? "noMatch" : "empty"}`)}
						getRowId={(schedule) => schedule.scheduleId}
						label={t(`${key}.history.title`)}
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
