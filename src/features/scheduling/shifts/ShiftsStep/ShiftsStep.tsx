import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon, PlusIcon } from "@/components/ui/Icon";
import { Tab, TabList, Tabs } from "@/components/ui/Tabs";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type { Shift } from "@/features/scheduling/scheduleDraft";
import { groupsOf } from "@/features/scheduling/shifts/api";
import { StepPanel } from "@/features/scheduling/StepPanel";

/** The first tab shows every shift; the ones after it, one group each. */
const ALL_TAB = 0;

/** Why a step's list is not shown: a notice, or an alert when loading failed. */
export type ListProblem = { message: string; alert: boolean };

export type ShiftsStepProps = {
	shifts: Array<Shift>;
	/** The shifts this schedule includes. */
	includedShiftIds: Array<string>;
	onIncludedChange: (shiftIds: Array<string>) => void;
	/** Offered only when the person may change this schedule. */
	onAdd?: () => void;
	/** Offered on each row only when the person may change shifts here. */
	onEdit?: (shift: Shift) => void;
	onDelete?: (shift: Shift) => void;
	/** What stops the person moving on, e.g. no shift chosen. */
	problem?: string;
	/** Why the list is not available, e.g. not permitted or failed to load. */
	listProblem?: ListProblem;
	className?: string;
};

/**
 * The schedule's own shifts, with adding, editing and deleting for
 * those allowed. A tab per shift group narrows the rows; what is ticked is
 * kept whether or not it is shown.
 */
export const ShiftsStep = ({
	shifts,
	includedShiftIds,
	onIncludedChange,
	onAdd,
	onEdit,
	onDelete,
	problem,
	listProblem,
	className,
}: ShiftsStepProps): FunctionComponent => {
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
		(): Array<DataTableColumn<Shift>> => [
			{
				id: "name",
				header: t("scheduling.shifts.name"),
				cell: (shift) => shift.name,
				cellClassName: "font-semibold",
			},
			{
				id: "timeRange",
				header: t("scheduling.shifts.timeRange"),
				cell: (shift) => formatTimeRange(shift, t),
			},
			{
				id: "days",
				header: t("scheduling.shifts.days"),
				cell: (shift) =>
					shift.days.map((day) => t(`scheduling.days.${day}`)).join(", "),
			},
			{
				id: "roleCount",
				header: t("scheduling.shifts.roleCount"),
				cell: (shift) =>
					t("scheduling.shifts.roleCountValue", { count: shift.roles.length }),
			},
			...(onEdit || onDelete
				? [
						{
							id: "actions",
							header: t("scheduling.shifts.actions"),
							headerClassName: "w-35",
							cell: (shift: Shift) => (
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
		[t, onEdit, onDelete]
	);

	return (
		<StepPanel
			className={className}
			description={t("scheduling.shifts.description")}
			title={t("scheduling.shifts.title")}
			actions={
				onAdd && (
					<Button leadingIcon={<PlusIcon />} size="sm" onClick={onAdd}>
						{t("scheduling.shifts.add")}
					</Button>
				)
			}
		>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
			{listProblem ? (
				<p
					className="mt-10 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={listProblem.alert || undefined}
					role={listProblem.alert ? "alert" : undefined}
				>
					{listProblem.message}
				</p>
			) : (
				<>
					{shifts.length > 0 && (
						<Tabs className="mt-10" selectedIndex={selected} onChange={setTab}>
							<TabList aria-label={t("scheduling.shifts.groups")}>
								<Tab count={shifts.length}>
									{t("scheduling.shifts.allShifts")}
								</Tab>
								{groups.map((name) => (
									<Tab key={name} count={countOf(name)}>
										{name}
									</Tab>
								))}
							</TabList>
						</Tabs>
					)}
					<DataTable
						className={shifts.length > 0 ? "mt-6" : "mt-10"}
						columns={columns}
						data={rows}
						emptyState={t("scheduling.shifts.empty")}
						getRowId={(shift) => shift.shiftId}
						label={t("scheduling.shifts.label")}
						selection={{
							rowLabel: (shift) => shift.name,
							selectedIds: includedShiftIds,
							onChange: onIncludedChange,
						}}
					/>
				</>
			)}
		</StepPanel>
	);
};
