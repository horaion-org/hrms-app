import { useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon, ViewIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { schedulingNoticeFrom } from "@/features/scheduling/schedulingNotice";
import { Can } from "@/features/workspace/Can";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import { formatPeriod } from "@/features/scheduling/periods";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import {
	exampleSchedules,
	scheduleStatusTones,
	type ScheduleRecord,
} from "@/features/scheduling/schedules";

const key = "scheduling.overview";

const matches = (schedule: ScheduleRecord, search: string): boolean => {
	const text = search.trim().toLocaleLowerCase();
	return (
		text === "" ||
		schedule.code.toLocaleLowerCase().includes(text) ||
		schedule.departmentName.toLocaleLowerCase().includes(text)
	);
};

/**
 * Each department's current schedule and the schedules before them. There is
 * no overview API yet, so both show example data, labelled as such.
 */
export const Scheduling = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const notice = schedulingNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);
	const [dismissed, setDismissed] = useState(false);
	const language = i18n.resolvedLanguage ?? i18n.language;
	const [schedules] = useState(() => exampleSchedules(new Date()));
	const [search, setSearch] = useState("");
	const current = schedules.current.filter((schedule) =>
		matches(schedule, search)
	);
	const history = schedules.history.filter((schedule) =>
		matches(schedule, search)
	);
	const columns = useMemo((): Array<DataTableColumn<ScheduleRecord>> => {
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
				cell: (schedule) => schedule.code,
				cellClassName: "font-semibold",
			},
			{
				id: "date",
				header: t(`${key}.history.date`),
				cell: (schedule) => formatPeriod(schedule.period, language),
				sortValue: (schedule) => schedule.period.start,
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
					<Badge
						className="uppercase"
						tone={scheduleStatusTones[schedule.status]}
					>
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
							aria-label={t(`${key}.viewNamed`, { code: schedule.code })}
							params={{ scheduleId: schedule.scheduleId }}
							to="/scheduling/$scheduleId"
							variant="icon"
						>
							<ViewIcon />
						</Button>
					</div>
				),
			},
		];
	}, [t, language]);

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t(`${key}.title`)}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			<Callout className="mt-6">{t(`${key}.example`)}</Callout>
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
			{current.length > 0 ? (
				<div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
					{current.map((schedule) => (
						<ScheduleCard key={schedule.scheduleId} schedule={schedule} />
					))}
				</div>
			) : (
				<p className="mt-12 text-sm text-neutral-700">{t(`${key}.noMatch`)}</p>
			)}
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
				<DataTable
					className="mt-8"
					columns={columns}
					data={history}
					emptyState={t(`${key}.noMatch`)}
					getRowId={(schedule) => schedule.scheduleId}
					label={t(`${key}.history.title`)}
				/>
			</section>
			{notice && !dismissed && (
				<Toast onDismiss={() => { setDismissed(true); }}>
					{t("scheduling.overview.generated", { name: notice.name })}
				</Toast>
			)}
		</>
	);
};
