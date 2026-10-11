import { getRouteApi } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon, EditIcon, PublishIcon } from "@/components/ui/Icon";
import { StatCard } from "@/components/ui/StatCard";
import { Toast } from "@/components/ui/Toast";
import { formatPeriod } from "@/features/scheduling/periods";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import { RosterWeekBar } from "@/features/scheduling/RosterWeekBar";
import {
	daysOf,
	exampleScheduleDetail,
	mondayOf,
	scheduleStatusTones,
	weeksOf,
	type RosterShift,
	type ScheduleDetail as Detail,
} from "@/features/scheduling/schedules";
import { ShiftDetailsPanel } from "@/features/scheduling/ShiftDetailsPanel";

const route = getRouteApi("/_authenticated/_app/scheduling_/$scheduleId");

const key = "scheduling.detail";

const BackLink = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button leadingIcon={<ArrowLeftIcon />} to="/scheduling" variant="textlink">
			{t(`${key}.back`)}
		</Button>
	);
};

/** The week of `schedule` holding today, or its first week. */
const weekForToday = (schedule: Detail): string => {
	const monday = mondayOf(new Date());
	const weeks = weeksOf(schedule.period);
	return (
		weeks.find((week) => week.start === monday)?.start ??
		weeks[0]?.start ??
		monday
	);
};

const withoutShift = (schedule: Detail, shiftId: string): Detail => ({
	...schedule,
	groups: schedule.groups.map((group) => ({
		...group,
		staff: group.staff.map((person) => ({
			...person,
			shifts: person.shifts.filter((shift) => shift.shiftId !== shiftId),
		})),
	})),
});

const Schedule = ({ initial }: { initial: Detail }): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const [schedule, setSchedule] = useState(initial);
	const [week, setWeek] = useState(() => weekForToday(initial));
	const [selected, setSelected] = useState<{
		staffName: string;
		shift: RosterShift;
	}>();
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	const editable = schedule.status === "PENDING";
	const numbers = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });

	return (
		<>
			<BackLink />
			<div className="mt-4 flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="text-4xl font-medium text-neutral-900">
						{t(`${key}.title`, { department: schedule.departmentName })}
					</h1>
					<p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-neutral-800">
						{formatPeriod(schedule.period, language)}
						<Badge
							className="uppercase"
							tone={scheduleStatusTones[schedule.status]}
						>
							{t(`scheduling.overview.statuses.${schedule.status}`)}
						</Badge>
					</p>
				</div>
				{editable && (
					<div className="flex flex-wrap gap-4">
						<Button
							disabled
							leadingIcon={<EditIcon />}
							size="sm"
							variant="secondary"
						>
							{t(`${key}.edit`)}
						</Button>
						<Button
							leadingIcon={<PublishIcon />}
							size="sm"
							onClick={() => {
								setSchedule((current) => ({ ...current, status: "APPROVED" }));
								setSelected(undefined);
								notify(t(`${key}.published`));
							}}
						>
							{t(`${key}.publish`)}
						</Button>
					</div>
				)}
			</div>
			<Callout className="mt-6">{t("scheduling.overview.example")}</Callout>
			<div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					caption={t(`${key}.coverageCaption`)}
					title={t(`${key}.coverage`)}
					value={t("scheduling.overview.percent", {
						value: numbers.format(schedule.coverage ?? 0),
					})}
				/>
				<StatCard
					caption={t(`${key}.openShiftsCaption`)}
					title={t(`${key}.openShifts`)}
					value={numbers.format(schedule.openShifts ?? 0)}
				/>
				<StatCard
					caption={t(`${key}.conflictsCaption`)}
					title={t(`${key}.conflicts`)}
					value={numbers.format(schedule.conflicts ?? 0)}
				/>
				<StatCard
					title={t(`${key}.staffAssigned`)}
					value={numbers.format(schedule.staffAssigned)}
					caption={t(`${key}.staffAssignedCaption`, {
						total: numbers.format(schedule.staffTotal),
					})}
				/>
			</div>
			<RosterWeekBar
				className="mt-12"
				week={week}
				weeks={weeksOf(schedule.period)}
				onWeekChange={setWeek}
				onToday={() => {
					setWeek(weekForToday(schedule));
				}}
			/>
			<div className="mt-7 flex flex-col items-start gap-6 lg:flex-row">
				<RosterGrid
					className="w-full lg:flex-1"
					days={daysOf(week)}
					groups={schedule.groups}
					selectedShiftId={selected?.shift.shiftId}
					onShiftSelect={(person, shift) => {
						setSelected({ staffName: person.name, shift });
					}}
				/>
				{selected && (
					<ShiftDetailsPanel
						editable={editable}
						shift={selected.shift}
						staffName={selected.staffName}
						onClose={() => {
							setSelected(undefined);
						}}
						onDelete={(shift) => {
							setSchedule((current) => withoutShift(current, shift.shiftId));
							setSelected(undefined);
							notify(t(`${key}.shiftDeleted`));
						}}
					/>
				)}
			</div>
			{toast && (
				<Toast
					key={toast.id}
					onDismiss={() => {
						setToast(undefined);
					}}
				>
					{toast.message}
				</Toast>
			)}
		</>
	);
};

/**
 * One schedule's roster, a week at a time, with a shift's details beside it.
 * There is no scheduling API yet, so it shows example data; publishing and
 * deleting a shift change only this page.
 */
export const ScheduleDetailPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const { scheduleId } = route.useParams();
	const found = useMemo(
		() => exampleScheduleDetail(scheduleId, new Date()),
		[scheduleId]
	);
	if (!found)
		return (
			<>
				<BackLink />
				<p className="mt-6 text-sm text-neutral-800" role="alert">
					{t(`${key}.notFound`)}
				</p>
			</>
		);
	return <Schedule key={scheduleId} initial={found} />;
};
