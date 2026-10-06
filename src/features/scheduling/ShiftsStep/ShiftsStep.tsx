import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon, PlusIcon } from "@/components/ui/Icon";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type { Shift } from "@/features/scheduling/scheduleDraft";
import { StepPanel } from "@/features/scheduling/StepPanel";

export type ShiftsStepProps = {
	shifts: Array<Shift>;
	/** The shifts this schedule includes. */
	includedShiftIds: Array<string>;
	onIncludedChange: (shiftIds: Array<string>) => void;
	onDelete: (shift: Shift) => void;
	/** What stops the person moving on, e.g. no shift chosen. */
	problem?: string;
	className?: string;
};

/**
 * The shifts to schedule. Adding and editing shifts wait for the scheduling
 * API, so those actions stay disabled.
 */
export const ShiftsStep = ({
	shifts,
	includedShiftIds,
	onIncludedChange,
	onDelete,
	problem,
	className,
}: ShiftsStepProps): FunctionComponent => {
	const { t } = useTranslation();
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
					t("scheduling.shifts.roleCountValue", { count: shift.staffNeeded }),
			},
			{
				id: "actions",
				header: t("scheduling.shifts.actions"),
				headerClassName: "w-35",
				cell: (shift) => (
					<div className="flex justify-center gap-2">
						<Button
							disabled
							aria-label={t("scheduling.shifts.edit", { name: shift.name })}
							variant="icon"
						>
							<EditIcon />
						</Button>
						<Button
							aria-label={t("scheduling.shifts.delete", { name: shift.name })}
							className="text-error-700"
							variant="icon"
							onClick={() => {
								onDelete(shift);
							}}
						>
							<DeleteIcon />
						</Button>
					</div>
				),
			},
		],
		[t, onDelete]
	);

	return (
		<StepPanel
			className={className}
			description={t("scheduling.shifts.description")}
			title={t("scheduling.shifts.title")}
			actions={
				<Button disabled leadingIcon={<PlusIcon />} size="sm">
					{t("scheduling.shifts.add")}
				</Button>
			}
		>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
			<DataTable
				className="mt-10"
				columns={columns}
				data={shifts}
				emptyState={t("scheduling.shifts.empty")}
				getRowId={(shift) => shift.shiftId}
				label={t("scheduling.shifts.label")}
				selection={{
					rowLabel: (shift) => shift.name,
					selectedIds: includedShiftIds,
					onChange: onIncludedChange,
				}}
			/>
		</StepPanel>
	);
};
