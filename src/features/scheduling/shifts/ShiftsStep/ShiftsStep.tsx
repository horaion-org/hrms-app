import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import type { ListProblem } from "@/features/scheduling/scheduleDraft";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import { ShiftTable } from "@/features/scheduling/shifts/ShiftTable";
import { StepPanel } from "@/features/scheduling/StepPanel";

export type ShiftsStepProps = {
	shifts: Array<ScheduleShift>;
	/** The shifts this schedule includes. */
	includedShiftIds: Array<string>;
	/** Offers a box per shift to tick it; without it the list is read-only, as a generated schedule's is. */
	onIncludedChange?: (shiftIds: Array<string>) => void;
	/** The schedule was generated: the shifts are the copies it was generated with. */
	frozen?: boolean;
	/** Offered only when the person may add shifts to the department. */
	onAdd?: () => void;
	/** Offered on each row only when the person may change shifts here. */
	onEdit?: (shift: ScheduleShift) => void;
	onDelete?: (shift: ScheduleShift) => void;
	/** What stops the person moving on, e.g. no shift chosen. */
	problem?: string;
	/** Why the list is not available, e.g. not permitted or failed to load. */
	listProblem?: ListProblem;
	className?: string;
};

/**
 * The department's shifts, ticking the ones this schedule includes, with
 * adding, editing and deleting for those allowed; once the schedule is
 * generated, the frozen copies it was generated with. A tab per shift group
 * narrows the rows; what is ticked is kept whether or not it is shown.
 */
export const ShiftsStep = ({
	shifts,
	includedShiftIds,
	onIncludedChange,
	frozen = false,
	onAdd,
	onEdit,
	onDelete,
	problem,
	listProblem,
	className,
}: ShiftsStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const description = t(
		frozen
			? "scheduling.shifts.frozenDescription"
			: "scheduling.shifts.description"
	);

	return (
		<StepPanel
			className={className}
			description={description}
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
				<ShiftTable
					className="mt-10"
					shifts={shifts}
					selection={
						onIncludedChange && {
							selectedIds: includedShiftIds,
							onChange: onIncludedChange,
						}
					}
					onDelete={onDelete}
					onEdit={onEdit}
				/>
			)}
		</StepPanel>
	);
};
