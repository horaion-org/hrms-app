import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { regenerationRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import { useScheduleActions } from "@/features/scheduling/schedules/useSchedule";

export type RegenerateDialogProps = {
	companyId: string;
	/** A schedule `regenerable` allows: GENERATED, GENERATION_FAILED or REJECTED, with no run open. */
	schedule: Schedule;
	onClose: () => void;
};

const key = "scheduling.regenerate";

/**
 * Asks before generating a schedule again, saying what is kept and what is
 * read again. A generated or rejected roster is replaced, so that asks in
 * red; after a failed generation there is nothing to replace, so it asks to
 * try again. A refusal shows inside the dialog.
 */
export const RegenerateDialog = ({
	companyId,
	schedule,
	onClose,
}: RegenerateDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const { regenerate } = useScheduleActions(companyId);
	const retrying = schedule.status === "GENERATION_FAILED";
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(retrying ? `${key}.retryConfirm` : `${key}.confirm`)}
			submitting={regenerate.isPending}
			title={t(retrying ? `${key}.retryTitle` : `${key}.title`)}
			tone={retrying ? "default" : "danger"}
			description={t(
				retrying ? `${key}.retryDescription` : `${key}.description`
			)}
			error={
				regenerate.error ? regenerationRefusal(regenerate.error, t) : undefined
			}
			onClose={onClose}
			onConfirm={() => {
				regenerate.mutate(
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
