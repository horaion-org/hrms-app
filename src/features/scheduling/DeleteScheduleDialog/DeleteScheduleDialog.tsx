import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatPeriod } from "@/features/scheduling/periods";
import {
	generationInProgress,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { deleteRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import { useScheduleActions } from "@/features/scheduling/schedules/useSchedule";

export type DeleteScheduleDialogProps = {
	companyId: string;
	schedule: Schedule;
	onClose: () => void;
	/** After the schedule is gone, e.g. to leave its roster. */
	onDeleted: () => void;
};

const key = "scheduling.delete";

/**
 * Asks before deleting a schedule, naming its department and week. While the
 * schedule is being generated it explains why it can't be deleted yet and
 * holds confirming back; a refusal shows inside the dialog.
 */
export const DeleteScheduleDialog = ({
	companyId,
	schedule,
	onClose,
	onDeleted,
}: DeleteScheduleDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const { remove } = useScheduleActions(companyId);
	const running = generationInProgress(schedule);
	const period = formatPeriod(
		{ start: schedule.periodStart, end: schedule.periodEnd },
		i18n.resolvedLanguage ?? i18n.language
	);
	return (
		<ConfirmDialog
			cancelLabel={t(running ? `${key}.close` : `${key}.cancel`)}
			confirmDisabled={running}
			confirmLabel={t(`${key}.confirm`)}
			error={remove.error ? deleteRefusal(remove.error, t) : undefined}
			submitting={remove.isPending}
			title={t(`${key}.title`, { name: schedule.name })}
			tone="danger"
			description={
				running
					? t(`${key}.runOpen`)
					: t(`${key}.description`, {
							department: schedule.departmentName,
							period,
						})
			}
			onClose={onClose}
			onConfirm={() => {
				remove.mutate(
					{
						unit: {
							branchId: schedule.branchId,
							departmentId: schedule.departmentId,
						},
						scheduleId: schedule.scheduleId,
					},
					{ onSuccess: onDeleted }
				);
			}}
		/>
	);
};
