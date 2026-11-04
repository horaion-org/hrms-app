import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Textarea } from "@/components/forms/Textarea";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
	SCHEDULE_REJECTION_REASON_MAX_LENGTH,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { decisionRefusal } from "@/features/scheduling/schedules/scheduleRefusal";
import { useScheduleActions } from "@/features/scheduling/schedules/useSchedule";

export type RejectScheduleDialogProps = {
	companyId: string;
	/** A GENERATED schedule with no run open. */
	schedule: Schedule;
	onClose: () => void;
};

const key = "scheduling.decision";

/**
 * Asks for the reason before rejecting a roster, as rejecting leave does:
 * the reason is required, and confirming without one says so on the field.
 * A refused reason shows on the field; any other refusal inside the dialog.
 */
export const RejectScheduleDialog = ({
	companyId,
	schedule,
	onClose,
}: RejectScheduleDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const id = useId();
	const { reject } = useScheduleActions(companyId);
	const [reason, setReason] = useState("");
	const [missingReason, setMissingReason] = useState(false);
	const refusal = reject.error ? decisionRefusal(reject.error, t) : undefined;
	const reasonError = missingReason
		? t(`${key}.required`)
		: refusal?.fields.reason;
	const dialogError =
		refusal && !refusal.fields.reason
			? (refusal.message ?? t(`${key}.refusal.failed`))
			: undefined;
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.rejectConfirm`)}
			description={t(`${key}.rejectDescription`)}
			error={dialogError}
			submitting={reject.isPending}
			title={t(`${key}.rejectTitle`)}
			tone="danger"
			onClose={onClose}
			onConfirm={() => {
				if (!reason.trim()) {
					setMissingReason(true);
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
				required
				aria-describedby={reasonError ? `${id}-error` : undefined}
				id={`${id}-reason`}
				maxLength={SCHEDULE_REJECTION_REASON_MAX_LENGTH}
				placeholder={t(`${key}.note`)}
				status={reasonError ? "error" : undefined}
				value={reason}
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
