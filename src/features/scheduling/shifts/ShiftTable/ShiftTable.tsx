import type { TFunction } from "i18next";
import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { AlertIcon, DeleteIcon, EditIcon } from "@/components/ui/Icon";
import { branchColumn } from "@/features/organisation/listColumns";
import {
	CONSTRAINT_COMPARISONS,
	type ConstraintComparison,
} from "@/features/scheduling/constraints/api";
import type { CapacityProblem } from "@/features/scheduling/constraints/capacityProblems";
import {
	formatDays,
	formatPaidHours,
	formatTimeRange,
} from "@/features/scheduling/formatShift";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import { WEEKDAYS } from "@/features/scheduling/shifts/api";
import { ShiftDayAxis } from "@/features/scheduling/shifts/ShiftDayAxis";
import { ShiftDayBar } from "@/features/scheduling/shifts/ShiftDayBar";
import {
	dayAxisOf,
	inDayOrder,
} from "@/features/scheduling/shifts/shiftDayAxis";
import type { ShiftNeed } from "@/features/scheduling/shifts/staffingNeeds";

/** How many job titles a row names before it counts the rest. */
const NAMED_JOB_TITLES = 2;

/** What the table reads of a shift; a list across departments also names its Branch and Department. */
export type ShiftTableRow = Pick<
	ScheduleShift,
	| "shiftId"
	| "name"
	| "group"
	| "colour"
	| "startTime"
	| "endTime"
	| "days"
	| "roles"
	| "unpaidBreakMinutes"
	| "carriesOvertime"
> & { branchName?: string; departmentName?: string };

/** What the staffing constraints ask of the shifts, for the Needed column. */
export type ShiftTableNeeds = {
	byShift: Map<string, Array<ShiftNeed>>;
	/** Why a need can never be met, where the staffing read says so; none without it. */
	capacityOf?: (need: ShiftNeed) => CapacityProblem | undefined;
};

export type ShiftTableProps<Row extends ShiftTableRow> = {
	shifts: Array<Row>;
	/** Offers a box per shift to tick it; without it the list is read-only. */
	selection?: {
		selectedIds: Array<string>;
		onChange: (shiftIds: Array<string>) => void;
	};
	/** Adds the Needed column; left out where the constraints may not be read. */
	needs?: ShiftTableNeeds;
	/** Offered on each row the person may change. */
	onEdit?: (shift: Row) => void;
	onDelete?: (shift: Row) => void;
	/** Whether this row offers Edit; every row when left out. */
	canEdit?: (shift: Row) => boolean;
	/** Whether this row offers Delete; every row when left out. */
	canDelete?: (shift: Row) => boolean;
	/** No Branch is chosen, so each row names its own. */
	showBranch?: boolean;
	/** No Department is chosen, so each row names its own. */
	showDepartment?: boolean;
	/** Shown across the table when there are no rows; "no shifts yet" when left out. */
	emptyState?: ReactNode;
	className?: string;
};

/** The days a shift runs, or "Every day" for all seven. */
const daysOf = (shift: ShiftTableRow, t: TFunction): string =>
	shift.days.length === WEEKDAYS.length
		? t("scheduling.shifts.everyDay")
		: formatDays(shift.days, t);

/** "Dispatcher, Operator +2": the first job titles by name, the rest counted. */
const jobTitlesOf = (shift: ShiftTableRow, t: TFunction): string => {
	const names = shift.roles.map((role) => role.name);
	const named = names.slice(0, NAMED_JOB_TITLES).join(", ");
	const more = names.length - NAMED_JOB_TITLES;
	return more > 0
		? t("scheduling.shifts.jobTitlesMore", { names: named, count: more })
		: named;
};

/** One need as it reads in the Needed column: "3 Duty Manager", "At most 1 Operator", "1 Team Lead on duty". */
const needLine = (need: ShiftNeed, t: TFunction): string => {
	const titles = t("scheduling.constraints.list", {
		items: need.jobTitleNames,
	});
	if (need.onDuty)
		return t("scheduling.shifts.needs.onDuty", {
			count: need.headcount,
			titles,
		});
	const comparison: ConstraintComparison =
		CONSTRAINT_COMPARISONS.find((each) => each === need.comparison) ??
		"AT_LEAST";
	return t(`scheduling.shifts.needs.${comparison}`, {
		count: need.headcount,
		titles,
	});
};

/**
 * Shifts as a table, under a heading per group, groups and shifts in the
 * order the day runs, each with its roster colour and a bar on one day axis
 * shared by the list so overlaps line up. With the staffing constraints, a
 * Needed column says what they ask of each shift, and warns where too few
 * people hold the job titles. What is ticked is kept whatever is shown. The
 * wizard's shift lists and the Shifts tab both list shifts with it; phones
 * keep the name and the actions, every other value on the name's line.
 */
export const ShiftTable = <Row extends ShiftTableRow>({
	shifts,
	selection,
	needs,
	onEdit,
	onDelete,
	canEdit,
	canDelete,
	showBranch = false,
	showDepartment = false,
	emptyState,
	className,
}: ShiftTableProps<Row>): FunctionComponent => {
	const { t } = useTranslation();
	const rows = useMemo(() => inDayOrder(shifts), [shifts]);
	const axis = useMemo(() => dayAxisOf(shifts), [shifts]);
	const columns = useMemo(
		(): Array<DataTableColumn<Row>> => [
			{
				id: "name",
				header: t("scheduling.shifts.name"),
				cell: (shift) => (
					<span className="flex flex-col gap-1">
						<span className="flex items-center gap-2 font-semibold">
							<span
								aria-hidden="true"
								className="size-3 shrink-0 rounded-xs"
								style={{ backgroundColor: shift.colour }}
							/>
							{shift.name}
						</span>
						<span className="text-neutral-700">
							{formatTimeRange(shift, t)} · {daysOf(shift, t)}
						</span>
					</span>
				),
				pin: "start",
			},
			...(showBranch ? [branchColumn<Row>(t)] : []),
			...(showDepartment
				? [
						{
							id: "department",
							header: t("scheduling.shifts.department"),
							cell: (shift: Row): string => shift.departmentName ?? "",
							hideBelow: "md",
						} satisfies DataTableColumn<Row>,
					]
				: []),
			{
				id: "when",
				header: t("scheduling.shifts.when"),
				headerCell: (
					<ShiftDayAxis axis={axis} label={t("scheduling.shifts.when")} />
				),
				headerClassName: "w-60",
				cell: (shift) => <ShiftDayBar axis={axis} shift={shift} />,
				hideBelow: "md",
			},
			{
				id: "paidHours",
				header: t("scheduling.shifts.paidHours"),
				cell: (shift) => (
					<div className="flex flex-col items-start gap-1">
						<span>{formatPaidHours(shift, t)}</span>
						{shift.carriesOvertime && (
							<Badge>{t("scheduling.shifts.carriesOvertime")}</Badge>
						)}
					</div>
				),
				// On the name's line the hours and the overtime mark sit side by side.
				summary: (shift) => (
					<span className="inline-flex items-center gap-1">
						{formatPaidHours(shift, t)}
						{shift.carriesOvertime && (
							<Badge>{t("scheduling.shifts.carriesOvertime")}</Badge>
						)}
					</span>
				),
				hideBelow: "md",
			},
			{
				id: "jobTitles",
				header: t("scheduling.shifts.roleCount"),
				cell: (shift) => jobTitlesOf(shift, t),
				summary: (shift) =>
					t("scheduling.shifts.roleCountValue", { count: shift.roles.length }),
				hideBelow: "md",
			},
			...(needs
				? [
						{
							id: "needed",
							header: t("scheduling.shifts.needed"),
							cell: (shift: Row): ReactNode => {
								const shiftNeeds = needs.byShift.get(shift.shiftId) ?? [];
								if (shiftNeeds.length === 0)
									return (
										<span className="text-neutral-700">
											{t("scheduling.shifts.needs.notSet")}
										</span>
									);
								return (
									<span className="flex flex-col gap-1">
										{shiftNeeds.map((need) => {
											const capacity = needs.capacityOf?.(need);
											return (
												<span key={need.constraintId} className="flex flex-col">
													<span>
														{needLine(need, t)}
														{need.ifPossible && (
															<span className="text-neutral-700">
																{" "}
																{t("scheduling.shifts.needs.ifPossible")}
															</span>
														)}
													</span>
													{capacity && (
														<span className="flex items-center gap-1 text-error-700">
															<AlertIcon
																aria-hidden="true"
																className="size-4"
															/>
															{t("scheduling.shifts.needs.capacity", {
																count: capacity.peopleWithTitles,
															})}
														</span>
													)}
												</span>
											);
										})}
									</span>
								);
							},
							hideBelow: "md",
						} satisfies DataTableColumn<Row>,
					]
				: []),
			...(onEdit || onDelete
				? [
						{
							id: "actions",
							header: t("scheduling.shifts.actions"),
							headerClassName: "w-35",
							pin: "end" as const,
							cell: (shift: Row) => (
								<div className="flex justify-center gap-2">
									{onEdit && (canEdit?.(shift) ?? true) && (
										<Button
											variant="icon"
											aria-label={t("scheduling.shifts.edit", {
												name: shift.name,
											})}
											onClick={() => {
												onEdit(shift);
											}}
										>
											<EditIcon />
										</Button>
									)}
									{onDelete && (canDelete?.(shift) ?? true) && (
										<Button
											className="text-error-700"
											variant="icon"
											aria-label={t("scheduling.shifts.delete", {
												name: shift.name,
											})}
											onClick={() => {
												onDelete(shift);
											}}
										>
											<DeleteIcon />
										</Button>
									)}
								</div>
							),
						},
					]
				: []),
		],
		[
			t,
			axis,
			needs,
			onEdit,
			onDelete,
			canEdit,
			canDelete,
			showBranch,
			showDepartment,
		]
	);
	const countIn = (group: string): number =>
		shifts.filter((shift) => shift.group === group).length;

	return (
		<DataTable
			className={className}
			columns={columns}
			data={rows}
			emptyState={emptyState ?? t("scheduling.shifts.empty")}
			getRowId={(shift) => shift.shiftId}
			label={t("scheduling.shifts.label")}
			rowGroups={{
				groupOf: (shift) => shift.group,
				label: (group) => (
					<>
						<span className="font-bold">{group}</span>{" "}
						<span className="text-xs text-neutral-700">
							{t("scheduling.shifts.groupCount", { count: countIn(group) })}
						</span>
					</>
				),
			}}
			selection={
				selection && {
					rowLabel: (shift) => shift.name,
					selectedIds: selection.selectedIds,
					onChange: selection.onChange,
				}
			}
		/>
	);
};
