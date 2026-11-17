import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { withdrawRefusal } from "@/features/approvals/approvalRefusal";
import { useApprovalDecisionActions } from "@/features/approvals/useApprovalActions";
import { useReloadScheduling } from "@/features/scheduling/schedules/useSchedule";

export type WithdrawApprovalDialogProps = {
	companyId: string;
	/** The roster's pending submission, which the viewer made. */
	instanceId: string;
	onClose: () => void;
	/** Called after the withdrawal, with the sentence the page announces. */
	onDone?: (announcement: string) => void;
};

/**
 * Asks before the submitter withdraws their roster from approval: its
 * approvers are no longer asked, and it can be submitted again. A refusal
 * (someone decided first) shows inside the dialog.
 */
export const WithdrawApprovalDialog = ({
	companyId,
	instanceId,
	onClose,
	onDone,
}: WithdrawApprovalDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const { withdraw } = useApprovalDecisionActions(
		companyId,
		useReloadScheduling(companyId)
	);
	return (
		<ConfirmDialog
			cancelLabel={t("scheduling.decision.cancel")}
			confirmLabel={t("approvals.withdrawDialog.confirm")}
			description={t("approvals.withdrawDialog.description")}
			error={withdraw.error ? withdrawRefusal(withdraw.error, t) : undefined}
			submitting={withdraw.isPending}
			title={t("approvals.withdrawDialog.title")}
			onClose={onClose}
			onConfirm={() => {
				withdraw.mutate(instanceId, {
					onSuccess: () => {
						onDone?.(t("approvals.announce.withdrawn"));
						onClose();
					},
				});
			}}
		/>
	);
};
