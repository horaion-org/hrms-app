import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { NumberStepper } from "@/components/forms/NumberStepper";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { AllocationStatus } from "@/features/scheduling/AllocationStatus";
import { formatDays, formatTimeRange } from "@/features/scheduling/formatShift";
import {
	allocatedStaff,
	shiftHours,
	type Shift,
} from "@/features/scheduling/scheduleDraft";

export type ShiftAllocationTableProps = {
	shifts: Array<Shift>;
	onAllocationChange: (
		shiftId: string,
		roleId: string,
		allocated: number
	) => void;
	className?: string;
};

/** How many people of each job role every shift needs, set with steppers. */
export const ShiftAllocationTable = ({
	shifts,
	onAllocationChange,
	className,
}: ShiftAllocationTableProps): FunctionComponent => {
	const { t } = useTranslation();
	const columns = useMemo(
		(): Array<DataTableColumn<Shift>> => [
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
						<AllocationStatus
							allocated={allocatedStaff(shift)}
							className="mt-3"
							needed={shift.staffNeeded}
						/>
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
								key={role.roleId}
								className="flex h-10 items-center justify-between gap-3 rounded-lg border border-neutral-400 bg-neutral-100"
							>
								<span className="min-w-0 truncate pl-3 font-semibold">
									{role.name}
								</span>
								<NumberStepper
									className="-my-px -mr-px"
									label={role.name}
									value={role.allocated}
									onChange={(allocated) => {
										onAllocationChange(shift.shiftId, role.roleId, allocated);
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
		[t, onAllocationChange]
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
