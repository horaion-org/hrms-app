import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Textarea } from "@/components/forms/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { APPROVAL_COMMENT_MAX_LENGTH } from "@/features/approvals/api";
import { approvalDecisionRefusal } from "@/features/approvals/approvalRefusal";
import type { OpenStep } from "@/features/approvals/approvalStanding";
import { useApprovalDecisionActions } from "@/features/approvals/useApprovalActions";
import {
	PUBLICATION_WITHDRAWAL_REMARK_MAX_LENGTH,
	SCHEDULE_REJECTION_REASON_MAX_LENGTH,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import {
	decisionRefusal,
	withdrawalRefusal,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	useReloadScheduling,
	useScheduleActions,
} from "@/features/scheduling/schedules/useSchedule";

/** What the note is for: rejecting a generated roster, or withdrawing a published one's publication. */
export type ScheduleNoteDecision = "reject" | "withdraw";

export type RejectScheduleDialogProps = {
	companyId: string;
	/** A GENERATED schedule with no run open to reject; a PUBLISHED one to withdraw. */
	schedule: Schedule;
	/** Rejecting by default. */
	decision?: ScheduleNoteDecision;
	/** Rejects at this open step of the roster's submission; rejects directly when left out. */
	approvalStep?: { instanceId: string; step: OpenStep };
	onClose: () => void;
	/** Called after a rejection at an approval step, with the sentence the page announces. */
	onDone?: (announcement: string) => void;
};

const key = "scheduling.decision";

/** The copy and limit of each decision's note. */
const NOTE_COPY = {
	reject: {
		description: `${key}.rejectDescription`,
		confirm: `${key}.rejectConfirm`,
		label: `${key}.reason`,
		required: `${key}.required`,
		maxLength: SCHEDULE_REJECTION_REASON_MAX_LENGTH,
	},
	withdraw: {
		description: `${key}.withdrawDescription`,
		confirm: `${key}.withdrawConfirm`,
		label: `${key}.withdrawRemark`,
		required: `${key}.withdrawRequired`,
		maxLength: PUBLICATION_WITHDRAWAL_REMARK_MAX_LENGTH,
	},
} as const;

/**
 * Asks for the note a decision on a roster needs before sending it, as
 * rejecting leave does: the reason to reject a roster, or the remark that
 * tells everyone on a published roster why its publication is withdrawn.
 * With `approvalStep` a rejection rejects the submission at that step, which
 * rejects the roster with the same reason. The note is required, and
 * confirming without one says so on the field. A refused note shows on the
 * field; any other refusal inside the dialog.
 */
export const RejectScheduleDialog = ({
	companyId,
	schedule,
	decision = "reject",
	approvalStep,
	onClose,
	onDone,
}: RejectScheduleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const { reject, withdraw } = useScheduleActions(companyId);
	const approval = useApprovalDecisionActions(
		companyId,
		useReloadScheduling(companyId)
	);
	const [note, setNote] = useState("");
	const [missingNote, setMissingNote] = useState(false);
	const copy = NOTE_COPY[decision];
	const atStep = decision === "reject" ? approvalStep : undefined;
	const mutation = atStep
		? approval.reject
		: decision === "reject"
			? reject
			: withdraw;
	const approvalRefused =
		atStep && approval.reject.error
			? approvalDecisionRefusal(approval.reject.error, t)
			: undefined;
	const rejectRefused =
		decision === "reject" && !atStep && reject.error
			? decisionRefusal(reject.error, t)
			: undefined;
	const withdrawRefused =
		decision === "withdraw" && withdraw.error
			? withdrawalRefusal(withdraw.error, t)
			: undefined;
	const refusal = approvalRefused ?? rejectRefused ?? withdrawRefused;
	// An approval's refused comment lands on the note, as a direct rejection's refused reason does.
	const refusedNote =
		approvalRefused?.fields.comment ??
		rejectRefused?.fields.reason ??
		withdrawRefused?.fields.remark;
	const noteError = missingNote ? t(copy.required) : refusedNote;
	const dialogError =
		refusal && !refusedNote
			? (refusal.message ?? t(`${key}.refusal.failed`))
			: undefined;
	const unit = {
		branchId: schedule.branchId,
		departmentId: schedule.departmentId,
	};
	const send = (): void => {
		if (atStep) {
			approval.reject.mutate(
				{
					instanceId: atStep.instanceId,
					stepOrder: atStep.step.order,
					comment: note,
				},
				{
					onSuccess: () => {
						onDone?.(
							t("approvals.announce.rejected", { label: atStep.step.label })
						);
						onClose();
					},
				}
			);
			return;
		}
		if (decision === "reject")
			reject.mutate(
				{ unit, scheduleId: schedule.scheduleId, reason: note },
				{ onSuccess: onClose }
			);
		else
			withdraw.mutate(
				{ unit, scheduleId: schedule.scheduleId, remark: note },
				{ onSuccess: onClose }
			);
	};
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(atStep ? "approvals.rejectDialog.confirm" : copy.confirm)}
			error={dialogError}
			submitting={mutation.isPending}
			tone="danger"
			description={t(
				atStep ? "approvals.rejectDialog.description" : copy.description
			)}
			title={
				atStep
					? t("approvals.rejectDialog.title", { label: atStep.step.label })
					: t(
							decision === "reject"
								? `${key}.rejectTitle`
								: `${key}.withdrawTitle`
						)
			}
			onClose={onClose}
			onConfirm={() => {
				if (!note.trim()) {
					setMissingNote(true);
					return;
				}
				send();
			}}
		>
			<label
				className="mb-3 block text-sm font-medium text-neutral-800"
				htmlFor={`${id}-note`}
			>
				{t(copy.label)}{" "}
				<span aria-hidden="true" className="text-error-600">
					*
				</span>
			</label>
			<Textarea
				autoFocus
				required
				aria-describedby={noteError ? `${id}-error` : undefined}
				id={`${id}-note`}
				maxLength={atStep ? APPROVAL_COMMENT_MAX_LENGTH : copy.maxLength}
				placeholder={t(`${key}.note`)}
				status={noteError ? "error" : undefined}
				value={note}
				onChange={(event) => {
					setNote(event.target.value);
					setMissingNote(false);
				}}
			/>
			{noteError && (
				<p
					className="mt-2 text-sm text-error-700"
					id={`${id}-error`}
					role="alert"
				>
					{noteError}
				</p>
			)}
		</ConfirmDialog>
	);
};
