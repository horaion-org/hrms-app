import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Textarea } from "@/components/forms/Textarea";
import { APPROVAL_COMMENT_MAX_LENGTH } from "@/features/leave/api";

/** The longest rejection reason the API keeps, in characters. */
const REJECTION_REASON_MAX_LENGTH = 2000;

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
	onNoteChange,
	onSubmit,
}: LeaveDecisionStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const rejecting = decision === "reject";
	const required = rejecting || commentRequired;
	return (
		<form
			className="border-t border-neutral-400 px-6 py-8"
			id={id}
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit();
			}}
		>
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
					rejecting ? REJECTION_REASON_MAX_LENGTH : APPROVAL_COMMENT_MAX_LENGTH
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
