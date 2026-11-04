import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { decisionRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import { useScheduleActions } from "@/features/scheduling/schedules/useSchedule";

export type PublishScheduleDialogProps = {
	companyId: string;
	/** A GENERATED schedule with no run open. */
	schedule: Schedule;
	onClose: () => void;
};

const key = "scheduling.decision";

/**
 * Asks before publishing a roster, saying that it becomes final for its
 * week. A refusal shows inside the dialog.
 */
export const PublishScheduleDialog = ({
	companyId,
	schedule,
	onClose,
}: PublishScheduleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const { publish } = useScheduleActions(companyId);
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.publishConfirm`)}
			description={t(`${key}.publishDescription`)}
			submitting={publish.isPending}
			title={t(`${key}.publishTitle`)}
			error={
				publish.error
					? (decisionRefusal(publish.error, t).message ??
						t(`${key}.refusal.failed`))
					: undefined
			}
			onClose={onClose}
			onConfirm={() => {
				publish.mutate(
					{
						unit: {
							branchId: schedule.branchId,
							departmentId: schedule.departmentId,
						},
						scheduleId: schedule.scheduleId,
					},
					{ onSuccess: onClose }
				);
			}}
		/>
	);
};
