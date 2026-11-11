import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import { Tab, TabList, Tabs } from "@/components/ui/Tabs";
import { branchColumn } from "@/features/organisation/listColumns";
import {
	formatPaidHours,
	formatTimeRange,
} from "@/features/scheduling/formatShift";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import { groupsOf } from "@/features/scheduling/shifts/api";

/** The first tab shows every shift; the ones after it, one group each. */
const ALL_TAB = 0;

/** What the table reads of a shift; a list across departments also names its Branch and Department. */
export type ShiftTableRow = Pick<
	ScheduleShift,
	| "shiftId"
	| "name"
	| "group"
	| "startTime"
	| "endTime"
	| "days"
	| "roles"
	| "unpaidBreakMinutes"
	| "carriesOvertime"
> & { branchName?: string; departmentName?: string };

export type ShiftTableProps<Row extends ShiftTableRow> = {
	shifts: Array<Row>;
	/** Offers a box per shift to tick it; without it the list is read-only. */
	selection?: {
		selectedIds: Array<string>;
		onChange: (shiftIds: Array<string>) => void;
	};
	/** Offered on each row the person may change. */
	onEdit?: (shift: Row) => void;
	onDelete?: (shift: Row) => void;
	/** Whether the person may change this row; every row when left out. */
	canChange?: (shift: Row) => boolean;
	/** No Branch is chosen, so each row names its own. */
	showBranch?: boolean;
	/** No Department is chosen, so each row names its own. */
	showDepartment?: boolean;
	/** Shown across the table when there are no rows; "no shifts yet" when left out. */
	emptyState?: ReactNode;
	className?: string;
};

/**
 * Shifts as a table, with a tab per shift group that narrows the rows; what
 * is ticked is kept whether or not it is shown. The wizard's shift step and
 * the Shifts tab both list shifts with it. Phones keep the name and the
 * actions; every other value reads on the name's line, as on Job titles.
 */
export const ShiftTable = <Row extends ShiftTableRow>({
	shifts,
	selection,
	onEdit,
	onDelete,
	canChange,
	showBranch = false,
	showDepartment = false,
	emptyState,
	className,
}: ShiftTableProps<Row>): FunctionComponent => {
	const { t } = useTranslation();
	const [tab, setTab] = useState(ALL_TAB);
	const groups = groupsOf(shifts);
	// A deleted group's tab disappears, so an index past the end means "all".
	const selected = tab > groups.length ? ALL_TAB : tab;
	const group = selected === ALL_TAB ? undefined : groups[selected - 1];
	const countOf = (name: string): number =>
		shifts.filter((shift) => shift.group === name).length;
	const rows =
		group === undefined
			? shifts
			: shifts.filter((shift) => shift.group === group);
	const columns = useMemo(
		(): Array<DataTableColumn<Row>> => [
			{
				id: "name",
				header: t("scheduling.shifts.name"),
				cell: (shift) => shift.name,
				cellClassName: "font-semibold",
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
				id: "timeRange",
				header: t("scheduling.shifts.timeRange"),
				cell: (shift) => formatTimeRange(shift, t),
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
				id: "days",
				header: t("scheduling.shifts.days"),
				cell: (shift) =>
					shift.days.map((day) => t(`scheduling.days.${day}`)).join(", "),
				hideBelow: "md",
			},
			{
				id: "roleCount",
				header: t("scheduling.shifts.roleCount"),
				cell: (shift) =>
					t("scheduling.shifts.roleCountValue", { count: shift.roles.length }),
				hideBelow: "md",
			},
			...(onEdit || onDelete
				? [
						{
							id: "actions",
							header: t("scheduling.shifts.actions"),
							headerClassName: "w-35",
							pin: "end" as const,
							cell: (shift: Row) =>
								(canChange?.(shift) ?? true) && (
									<div className="flex justify-center gap-2">
										{onEdit && (
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
										{onDelete && (
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
		[t, onEdit, onDelete, canChange, showBranch, showDepartment]
	);

	return (
		<div className={className}>
			{shifts.length > 0 && (
				<Tabs selectedIndex={selected} onChange={setTab}>
					<TabList aria-label={t("scheduling.shifts.groups")}>
						<Tab count={shifts.length}>{t("scheduling.shifts.allShifts")}</Tab>
						{groups.map((name) => (
							<Tab key={name} count={countOf(name)}>
								{name}
							</Tab>
						))}
					</TabList>
				</Tabs>
			)}
			<DataTable
				className={shifts.length > 0 ? "mt-6" : undefined}
				columns={columns}
				data={rows}
				emptyState={emptyState ?? t("scheduling.shifts.empty")}
				getRowId={(shift) => shift.shiftId}
				label={t("scheduling.shifts.label")}
				selection={
					selection && {
						rowLabel: (shift) => shift.name,
						selectedIds: selection.selectedIds,
						onChange: selection.onChange,
					}
				}
			/>
		</div>
	);
};
