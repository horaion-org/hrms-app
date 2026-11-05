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
	/** Why the note was refused or is missing. */
	error?: string;
	onNoteChange: (note: string) => void;
	onSubmit: () => void;
};

/**
 * The confirmation step under a request: a reason to reject it, which is
 * required, or a comment to approve it, which is not. The dialog's footer
 * submits it; the dialog decides what a submit does.
 */
export const LeaveDecisionStep = ({
	id,
	decision,
	note,
	error,
	onNoteChange,
	onSubmit,
}: LeaveDecisionStepProps): FunctionComponent => {
	const { t } = useTranslation();
	const rejecting = decision === "reject";
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
				{t(rejecting ? "leave.reason" : "leave.comment")}
				{rejecting && (
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
				required={rejecting}
				status={error ? "error" : undefined}
				value={note}
				maxLength={
					rejecting ? REJECTION_REASON_MAX_LENGTH : APPROVAL_COMMENT_MAX_LENGTH
				}
				onChange={(event) => {
					onNoteChange(event.target.value);
				}}
			/>
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
