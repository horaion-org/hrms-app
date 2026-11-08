import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Textarea } from "@/components/forms/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { APPROVAL_COMMENT_MAX_LENGTH } from "@/features/approvals/api";
import { decisionRefusal as approvalRefusal } from "@/features/approvals/approvalRefusal";
import type { OpenStep } from "@/features/approvals/approvalStanding";
import { useApprovalDecisionActions } from "@/features/approvals/useApprovalActions";
import {
	SCHEDULE_REJECTION_REASON_MAX_LENGTH,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { decisionRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useReloadScheduling,
	useScheduleActions,
} from "@/features/scheduling/schedules/useSchedule";

export type RejectScheduleDialogProps = {
	companyId: string;
	/** A GENERATED schedule with no run open. */
	schedule: Schedule;
	/** Rejects at this open step of the roster's submission; rejects directly when left out. */
	approvalStep?: { instanceId: string; step: OpenStep };
	onClose: () => void;
	/** Called after a rejection at an approval step, with the sentence the page announces. */
	onDone?: (announcement: string) => void;
};

const key = "scheduling.decision";

/**
 * Asks for the reason before rejecting a roster, as rejecting leave does:
 * the reason is required, and confirming without one says so on the field.
 * With `approvalStep` it rejects the submission at that step, which rejects
 * the roster with the same reason. A refused reason shows on the field; any
 * other refusal inside the dialog.
 */
export const RejectScheduleDialog = ({
	companyId,
	schedule,
	approvalStep,
	onClose,
	onDone,
}: RejectScheduleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const { reject } = useScheduleActions(companyId);
	const approval = useApprovalDecisionActions(
		companyId,
		useReloadScheduling(companyId)
	);
	const [reason, setReason] = useState("");
	const [missingReason, setMissingReason] = useState(false);
	const mutation = approvalStep ? approval.reject : reject;
	const approvalRefused =
		approvalStep && approval.reject.error
			? approvalRefusal(approval.reject.error, t)
			: undefined;
	const directRefused =
		!approvalStep && reject.error
			? decisionRefusal(reject.error, t)
			: undefined;
	// An approval's refused comment lands on the reason, as a direct rejection's refused reason does.
	const refusedReason =
		approvalRefused?.fields.comment ?? directRefused?.fields.reason;
	const refusal = approvalRefused ?? directRefused;
	const reasonError = missingReason ? t(`${key}.required`) : refusedReason;
	const dialogError =
		refusal && !refusedReason
			? (refusal.message ?? t(`${key}.refusal.failed`))
			: undefined;
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			error={dialogError}
			submitting={mutation.isPending}
			tone="danger"
			confirmLabel={t(
				approvalStep ? "approvals.rejectDialog.confirm" : `${key}.rejectConfirm`
			)}
			description={t(
				approvalStep
					? "approvals.rejectDialog.description"
					: `${key}.rejectDescription`
			)}
			title={
				approvalStep
					? t("approvals.rejectDialog.title", {
							label: approvalStep.step.label,
						})
					: t(`${key}.rejectTitle`)
			}
			onClose={onClose}
			onConfirm={() => {
				if (!reason.trim()) {
					setMissingReason(true);
					return;
				}
				if (approvalStep) {
					approval.reject.mutate(
						{
							instanceId: approvalStep.instanceId,
							stepOrder: approvalStep.step.order,
							comment: reason,
						},
						{
							onSuccess: () => {
								onDone?.(
									t("approvals.announce.rejected", {
										label: approvalStep.step.label,
									})
								);
								onClose();
							},
						}
					);
					return;
				}
				reject.mutate(
					{
						unit: {
							branchId: schedule.branchId,
							departmentId: schedule.departmentId,
						},
						scheduleId: schedule.scheduleId,
						reason,
					},
					{ onSuccess: onClose }
				);
			}}
		>
			<label
				className="mb-3 block text-sm font-medium text-neutral-800"
				htmlFor={`${id}-reason`}
			>
				{t(`${key}.reason`)}{" "}
				<span aria-hidden="true" className="text-error-600">
					*
				</span>
			</label>
			<Textarea
				autoFocus
				required
				aria-describedby={reasonError ? `${id}-error` : undefined}
				id={`${id}-reason`}
				placeholder={t(`${key}.note`)}
				status={reasonError ? "error" : undefined}
				value={reason}
				maxLength={
					approvalStep
						? APPROVAL_COMMENT_MAX_LENGTH
						: SCHEDULE_REJECTION_REASON_MAX_LENGTH
				}
				onChange={(event) => {
					setReason(event.target.value);
					setMissingReason(false);
				}}
			/>
			{reasonError && (
				<p
					className="mt-2 text-sm text-error-700"
					id={`${id}-error`}
					role="alert"
				>
					{reasonError}
				</p>
			)}
		</ConfirmDialog>
	);
};
