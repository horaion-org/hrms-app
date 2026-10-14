import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { NumberStepper } from "@/components/forms/NumberStepper";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatDays, formatTimeRange } from "@/features/scheduling/formatShift";
import {
	allocatedStaff,
	allocatedTo,
	shiftHours,
	type Allocations,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

export type ShiftAllocationTableProps = {
	shifts: Array<ScheduleShift>;
	/** People allocated so far, by shift then job title. */
	allocations: Allocations;
	onAllocationChange: (
		shiftId: string,
		jobTitleId: string,
		allocated: number
	) => void;
	className?: string;
};

/** How many people of each job role every shift gets, set with steppers. */
export const ShiftAllocationTable = ({
	shifts,
	allocations,
	onAllocationChange,
	className,
}: ShiftAllocationTableProps): FunctionComponent => {
	const { t } = useTranslation();
	const columns = useMemo(
		(): Array<DataTableColumn<ScheduleShift>> => [
			{
				id: "shift",
				header: t("scheduling.forecast.shift"),
				headerClassName: "w-60",
				cellClassName: "py-4 align-top",
				cell: (shift) => (
					<div className="flex flex-col items-start">
						<span className="text-sm font-bold">{shift.name}</span>
						<span className="mt-1 flex gap-1 font-medium text-neutral-800">
							<span>{formatTimeRange(shift, t)}</span>
							<span aria-hidden="true">•</span>
							<span>
								{t("scheduling.forecast.hours", { count: shiftHours(shift) })}
							</span>
						</span>
						<span className="mt-3 text-xs font-semibold text-neutral-800">
							{t("scheduling.forecast.allocatedTotal", {
								count: allocatedStaff(shift, allocations),
							})}
						</span>
					</div>
				),
			},
			{
				id: "allocation",
				header: t("scheduling.forecast.allocation"),
				headerClassName: "w-125",
				cellClassName: "py-4",
				cell: (shift) => (
					<ul className="flex flex-col gap-3">
						{shift.roles.map((role) => (
							<li
								key={role.jobTitleId}
								className="flex h-10 items-center justify-between gap-3 rounded-lg border border-neutral-400 bg-neutral-100"
							>
								<span className="min-w-0 truncate pl-3 font-semibold">
									{role.name}
								</span>
								<NumberStepper
									className="-my-px -mr-px"
									label={role.name}
									value={allocatedTo(
										allocations,
										shift.shiftId,
										role.jobTitleId
									)}
									onChange={(allocated) => {
										onAllocationChange(
											shift.shiftId,
											role.jobTitleId,
											allocated
										);
									}}
								/>
							</li>
						))}
					</ul>
				),
			},
			{
				id: "appliesTo",
				header: t("scheduling.forecast.appliesTo"),
				cell: (shift) => formatDays(shift.days, t),
			},
		],
		[t, allocations, onAllocationChange]
	);

	return (
		<DataTable
			className={className}
			columns={columns}
			data={shifts}
			getRowId={(shift) => shift.shiftId}
			label={t("scheduling.forecast.label")}
		/>
	);
};
