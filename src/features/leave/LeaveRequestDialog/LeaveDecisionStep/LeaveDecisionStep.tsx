import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Textarea } from "@/components/forms/Textarea";
import {
	LEAVE_APPROVAL_COMMENT_MAX_LENGTH,
	LEAVE_REJECTION_REASON_MAX_LENGTH,
} from "@/features/leave/api";

/** The decision being confirmed. */
export type LeaveDecision = "approve" | "reject";

export type LeaveDecisionStepProps = {
	/** The form's id, so the dialog's footer can submit it. */
	id: string;
	decision: LeaveDecision;
	/** The rejection reason (required) or the approval comment (optional), as typed. */
	note: string;
	/**
	 * Approval only: the comment is required too, because the leave reaches
	 * back before today and the member must be told why.
	 */
	commentRequired?: boolean;
	/** Why the note was refused or is missing. */
	error?: string;
	/**
	 * Under an approval flow: which step is being decided and what the
	 * decision does, e.g. "Step 1 of 2 (Manager). After you approve, the
	 * next step is asked."
	 */
	stepNote?: string;
	/** The longest note the route that decides keeps; the leave routes' limits by default. */
	noteMaxLength?: number;
	onNoteChange: (note: string) => void;
	onSubmit: () => void;
};

/**
 * The confirmation step under a request: a reason to reject it, which is
 * required, or a comment to approve it, which is not unless the leave
 * reaches back before today. The dialog's footer
 * submits it; the dialog decides what a submit does.
 */
export const LeaveDecisionStep = ({
	id,
	decision,
	note,
	commentRequired = false,
	error,
	stepNote,
	noteMaxLength,
	onNoteChange,
	onSubmit,
}: LeaveDecisionStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const rejecting = decision === "reject";
	const required = rejecting || commentRequired;
	return (
		<form
			className="mt-8 border-t border-neutral-400 pt-8"
			id={id}
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit();
			}}
		>
			{stepNote && <p className="mb-4 text-sm text-neutral-800">{stepNote}</p>}
			<label
				className="mb-3 block text-sm font-medium text-neutral-800"
				htmlFor={`${id}-decision-note`}
			>
				{t(
					rejecting
						? "leave.reason"
						: required
							? "leave.commentRequired"
							: "leave.comment"
				)}
				{required && (
					<>
						{" "}
						<span aria-hidden="true" className="text-error-600">
							*
						</span>
					</>
				)}
			</label>
			<Textarea
				aria-describedby={error ? `${id}-decision-error` : undefined}
				id={`${id}-decision-note`}
				placeholder={t("leave.note")}
				required={required}
				status={error ? "error" : undefined}
				value={note}
				maxLength={
					noteMaxLength ??
					(rejecting
						? LEAVE_REJECTION_REASON_MAX_LENGTH
						: LEAVE_APPROVAL_COMMENT_MAX_LENGTH)
				}
				onChange={(event) => {
					onNoteChange(event.target.value);
				}}
			/>
			{commentRequired && !rejecting && (
				<p className="mt-2 text-sm text-neutral-700">
					{t("leave.pastDaysComment")}
				</p>
			)}
			{error && (
				<p
					className="mt-2 text-sm text-error-700"
					id={`${id}-decision-error`}
					role="alert"
				>
					{error}
				</p>
			)}
		</form>
	);
};
