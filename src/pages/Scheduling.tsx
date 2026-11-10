import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PlusIcon, ViewIcon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { myPendingApprovalsQuery } from "@/features/approvals/api";
import { scheduleCardApprovalLine } from "@/features/approvals/approvalStanding";
import { scheduleStatusTones } from "@/features/scheduling/schedules/scheduleStatusTones";
import { schedulingNoticeFrom } from "@/features/scheduling/schedulingNotice";
import { Can } from "@/features/workspace/Can";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import { formatPeriod } from "@/features/scheduling/periods";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useSchedules } from "@/features/scheduling/schedules/useSchedules";
import { decidable, type Schedule } from "@/features/scheduling/schedules/api";
import { scheduleViewLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { ScheduleCard } from "@/features/scheduling/ScheduleCard";
import { ScheduleMenu } from "@/features/scheduling/ScheduleMenu";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips } from "@/features/workspace/filterChips";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import {
	offersDepartmentChoice,
	selectedUnits,
} from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const key = "scheduling.overview";

const route = getRouteApi("/_authenticated/_app/scheduling");

const matches = (schedule: Schedule, search: string): boolean => {
	const text = search.trim().toLocaleLowerCase();
	return (
		text === "" ||
		schedule.name.toLocaleLowerCase().includes(text) ||
		schedule.departmentName.toLocaleLowerCase().includes(text)
	);
};

/**
 * Dashboard cards and history from the accessible schedules in the
 * header's Branch, narrowed to a Department from the Filters; both are
 * kept in the URL, the search stays on the page.
 */
export const Scheduling = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const notice = schedulingNoticeFrom(
		useRouterState({ select: (state) => state.location.state })
	);
	const [dismissed, setDismissed] = useState(false);
	const language = formattingLocale(i18n);
	const companyId = useCurrentCompanyId();
	const navigate = route.useNavigate();
	const units = useUnitSelection(
		companyId,
		SCHEDULE_READ_KEYS,
		unitSelectionOf(route.useSearch()),
		SCHEDULING_UNIT_RULES
	);
	const list = useSchedules(companyId, selectedUnits(units));
	// What waits on the caller, so a card can say "Waiting on you"; asked only of possible approvers.
	const waitingOnMe = useQuery(
		myPendingApprovalsQuery(
			companyId,
			useAccess().canAnywhere("approval:decide")
		)
	).data;
	const [search, setSearch] = useState("");
	const chooseDepartment = (department: string | undefined): void => {
		void navigate({ search: (previous) => ({ ...previous, department }) });
	};
	// The Branch is the header's scope; the Department is the one filter.
	const chips = departmentChips(
		units,
		() => {
			chooseDepartment(undefined);
		},
		t
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
				pin: "start",
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
					<Badge tone={scheduleStatusTones[schedule.status]}>
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
				pin: "end",
				cell: (schedule) => (
					<div className="flex justify-center">
						<Button
							{...scheduleViewLink(schedule)}
							aria-label={t(`${key}.viewNamed`, { code: schedule.name })}
							variant="icon"
						>
							<ViewIcon />
						</Button>
						<ScheduleMenu companyId={companyId} schedule={schedule} />
					</div>
				),
			},
		];
	}, [t, language, companyId]);
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
				chips={chips}
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
				filterFields={
					// Scheduling has no status filter: with no Department to choose, no Filters.
					offersDepartmentChoice(units) && (
						<DepartmentFilter selection={units} onChange={chooseDepartment} />
					)
				}
				onSearchChange={setSearch}
				onClearFilters={() => {
					chooseDepartment(undefined);
				}}
			/>
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
								schedule={schedule}
								approvalLine={scheduleCardApprovalLine(
									{
										scheduleId: schedule.scheduleId,
										awaitingDecision: decidable(schedule),
										publication: schedule.publication,
									},
									waitingOnMe ?? []
								)}
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
