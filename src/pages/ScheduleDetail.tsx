import { getRouteApi } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { useQuery } from "@tanstack/react-query";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";
import { workspaceQuery } from "@/features/workspace/api";
import { departmentChoices } from "@/features/workspace/unitChoices";
import { useAccess } from "@/features/workspace/useAccess";
import { rosterPreviewAccess } from "@/features/scheduling/ShiftDetailsPanel/rosterPreviewAccess";
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
import type { RosterShiftAction } from "@/features/scheduling/ShiftDetailsPanel/RosterShiftDialog";
import { ApiRosterShiftDialog } from "@/features/scheduling/ShiftDetailsPanel/ApiRosterShiftDialog";
import { ReassignRosterShiftDialog } from "@/features/scheduling/ShiftDetailsPanel/ReassignRosterShiftDialog";

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
		staffId: string;
		staffName: string;
		shift: RosterShift;
	}>();
	const [action, setAction] = useState<RosterShiftAction>();
	const companyId = useCurrentCompanyId();
	const access = useAccess();
	const { data: workspace } = useQuery(workspaceQuery);
	const [previewDepartmentId, setPreviewDepartmentId] = useState("");
	const previewUnit = workspace
		? departmentChoices(workspace, companyId, ["shift:read"], {
				activeOnly: true,
			}).find((unit) => unit.departmentId === previewDepartmentId)
		: undefined;
	const selectedShift = selected
		? {
				...selected.shift,
				departmentId: selected.shift.departmentId ?? previewUnit?.departmentId,
				branchId: selected.shift.branchId ?? previewUnit?.branchId,
			}
		: undefined;
	const permissions = rosterPreviewAccess(
		access,
		selectedShift?.departmentId,
		schedule.status === "PENDING"
	);
	if (action && !permissions[action]) setAction(undefined);
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	const editable = schedule.status === "PENDING";
	const numbers = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
	const ActionDialog =
		action === "reassign" ? ReassignRosterShiftDialog : ApiRosterShiftDialog;

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
			</div>
			<Callout className="mt-6">{t("scheduling.overview.example")}</Callout>
			<div className="mt-6 max-w-lg space-y-2">
				<p className="text-sm text-neutral-700">
					{t(`${key}.shiftAction.permissionScopeHelp`)}
				</p>
				<DepartmentSelector
					activeOnly
					aria-label={t(`${key}.shiftAction.permissionScope`)}
					companyId={companyId}
					keys={["shift:read"]}
					placeholder={t(`${key}.shiftAction.permissionScope`)}
					value={previewUnit?.departmentId ?? ""}
					onChange={(id) => {
						setPreviewDepartmentId(id);
						setSelected(undefined);
						setAction(undefined);
					}}
				/>
			</div>
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
						setSelected({
							staffId: person.staffId,
							staffName: person.name,
							shift,
						});
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
						onDelete={
							permissions.delete
								? (shift): void => {
										if (!permissions.delete) return;
										setSchedule((current) =>
											withoutShift(current, shift.shiftId)
										);
										setSelected(undefined);
										notify(t(`${key}.shiftDeleted`));
									}
								: undefined
						}
						onDuplicate={
							permissions.duplicate
								? (): void => {
										setAction("duplicate");
									}
								: undefined
						}
						onEdit={
							permissions.edit
								? (): void => {
										setAction("edit");
									}
								: undefined
						}
						onReassign={
							permissions.reassign
								? (): void => {
										setAction("reassign");
									}
								: undefined
						}
					/>
				)}
			</div>
			{action && selected && selectedShift && permissions[action] && (
				<ActionDialog
					action={action}
					period={schedule.period}
					shift={selectedShift}
					staff={schedule.groups.flatMap((group) => group.staff)}
					staffId={selected.staffId}
					onApply={(staffId, changed, apiPerson) => {
						if (
							!permissions[action] ||
							!rosterPreviewAccess(access, changed.departmentId, editable)[
								action
							]
						)
							return;
						const shift =
							action === "duplicate"
								? { ...changed, shiftId: crypto.randomUUID() }
								: changed;
						setSchedule((current) => {
							const base =
								action === "duplicate"
									? current
									: withoutShift(current, selected.shift.shiftId);
							if (
								apiPerson &&
								!base.groups.some((group) =>
									group.staff.some((person) => person.staffId === staffId)
								)
							) {
								const groupId = changed.departmentId ?? "api-staff";
								const person = { ...apiPerson, shifts: [shift] };
								const existing = base.groups.some(
									(group) => group.groupId === groupId
								);
								return {
									...base,
									groups: existing
										? base.groups.map((group) =>
												group.groupId === groupId
													? {
															...group,
															headcount: group.headcount + 1,
															staff: [...group.staff, person],
														}
													: group
											)
										: [
												...base.groups,
												{
													groupId,
													name:
														apiPerson.departmentName ?? schedule.departmentName,
													headcount: 1,
													staff: [person],
												},
											],
								};
							}
							return {
								...base,
								groups: base.groups.map((group) => ({
									...group,
									staff: group.staff.map((person) =>
										person.staffId === staffId
											? { ...person, shifts: [...person.shifts, shift] }
											: person
									),
								})),
							};
						});
						const person = schedule.groups
							.flatMap((group) => group.staff)
							.find((item) => item.staffId === staffId);
						setSelected({
							staffId,
							staffName: apiPerson?.name ?? person?.name ?? selected.staffName,
							shift,
						});
						setWeek(mondayOf(shift.date));
						notify(t(`scheduling.detail.shiftAction.done.${action}`));
						setAction(undefined);
					}}
					onClose={() => {
						setAction(undefined);
					}}
				/>
			)}
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
 * Roster assignments remain example data; editing and deleting
 * change only this page. Edit choices use workspace units and API shift roles.
 */
export const ScheduleDetailPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const companyId = useCurrentCompanyId();
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
	return <Schedule key={`${companyId}/${scheduleId}`} initial={found} />;
};
