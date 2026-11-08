import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { todayDate, type IsoDate } from "@/components/forms/Calendar";
import { Button } from "@/components/ui/Button";
import { CrossIcon, TickIcon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { rosteredDaysQuery, type CompanyLeaveType } from "@/features/leave/api";
import type { ApplyField, DecisionField } from "@/features/leave/leaveRefusal";
import type { LeaveRequest, LeaveRequestBody } from "@/features/leave/types";
import type { Refusal } from "@/features/organisation/refusal";
import {
	LeaveApplyForm,
	type ApplyEmployees,
	type LeaveTypesStatus,
} from "./LeaveApplyForm";
import { LeaveDecisionStep } from "./LeaveDecisionStep";
import { LeaveRequestDetails } from "./LeaveRequestDetails";
import { LeaveRequestLifecycle } from "./LeaveRequestLifecycle";
import { RosteredDaysNotice } from "./RosteredDaysNotice";

export type { ApplyEmployees } from "./LeaveApplyForm";

/** Where a review stands: reading the request, or confirming a decision with its note. */
type ReviewStep = "review" | "reject" | "approve";

export type LeaveRequestDialogProps = {
	request?: LeaveRequest;
	/** `reject` and `approve` open straight at that decision's confirmation step. */
	mode?: "view" | "reject" | "approve" | "apply" | "record";
	/**
	 * With it, the dialog reads rostered days and the history, and offers
	 * withdrawing, changing and cancelling. `own` says the request is the reader's.
	 */
	lifecycle?: {
		companyId: string;
		own: boolean;
		onDone: (message: string) => void;
	};
	/** Who leave may be applied for; left out in `apply` mode when the caller applies for themself. */
	employees?: ApplyEmployees;
	/**
	 * The company's leave types, for `apply` mode. Only active types that are
	 * not the scheduler's own are offered, grouped by how they are counted.
	 */
	leaveTypes?: ReadonlyArray<CompanyLeaveType>;
	/**
	 * How reading `leaveTypes` stands, in `apply` mode: the Type field says
	 * it is loading while "pending", and offers `onRetryLeaveTypes` on "error".
	 */
	leaveTypesStatus?: LeaveTypesStatus;
	onRetryLeaveTypes?: () => void;
	/** Whether the person may decide the shown request; Approve and Reject are offered only then. */
	canReview?: boolean;
	/** While a decision or an application is being sent. */
	busy?: boolean;
	/** Why the last decision or application was refused: on a field, or as the dialog's alert. */
	refusal?: Refusal<ApplyField | DecisionField>;
	onClose: () => void;
	/** `comment` is trimmed, and empty when the reviewer wrote none. */
	onApprove: (
		request: LeaveRequest,
		comment: string,
		takeOffRosteredDays: boolean
	) => void;
	onReject: (request: LeaveRequest, reason: string) => void;
	/** `membershipId` is null when the caller applies for themself. */
	onCreate: (membershipId: string | null, body: LeaveRequestBody) => void;
	/** Today; the reviewer's device's by default. Approving leave before it needs a comment. */
	today?: IsoDate;
};

/**
 * One request to review, approve with an optional comment, reject with a
 * reason, or a new application on a person's behalf. Both decisions ask for
 * confirmation in a second step. The dialog only collects and shows; the
 * caller sends and hands back what the API answered.
 *
 * This file is the review: the request's details (`LeaveRequestDetails`),
 * the decision being confirmed (`LeaveDecisionStep`) and the footer that
 * moves between them. An application is `LeaveApplyForm`.
 */
export const LeaveRequestDialog = ({
	request,
	mode = "view",
	lifecycle,
	employees,
	leaveTypes = [],
	leaveTypesStatus = "success",
	onRetryLeaveTypes,
	canReview = false,
	busy = false,
	refusal,
	onClose,
	onApprove,
	onReject,
	onCreate,
	today: todayOverride,
}: LeaveRequestDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	// Read once when the dialog opens, outside render.
	const [deviceToday] = useState(() => todayDate(Date.now()));
	const today = todayOverride ?? deviceToday;
	const id = useId();
	const [step, setStep] = useState<ReviewStep>(
		mode === "reject" || mode === "approve" ? mode : "review"
	);
	// Both notes outlive a cancelled step, so going back to it keeps what was typed.
	const [rejectionReason, setRejectionReason] = useState("");
	const [approvalComment, setApprovalComment] = useState("");
	const [missingRejectionReason, setMissingRejectionReason] = useState(false);
	const [missingApprovalComment, setMissingApprovalComment] = useState(false);
	const [takeOffConfirmed, setTakeOffConfirmed] = useState(false);
	const rostered = useQuery(
		rosteredDaysQuery(
			lifecycle?.companyId ?? "",
			{ start: request?.startDate ?? "", end: request?.endDate ?? "" },
			request?.membershipId,
			lifecycle !== undefined && request !== undefined && step === "approve"
		)
	);
	const rosteredDays = rostered.data ?? [];
	const unconfirmedClash = rosteredDays.length > 0 && !takeOffConfirmed;
	// Approving on days not read yet is how a 409 comes back with nothing to confirm.
	const rosterUnknown =
		lifecycle !== undefined &&
		step === "approve" &&
		(rostered.isFetching || rostered.isError);
	if (mode === "apply" || mode === "record")
		return (
			<LeaveApplyForm
				busy={busy}
				companyId={lifecycle?.companyId}
				employees={employees}
				leaveTypes={leaveTypes}
				leaveTypesStatus={leaveTypesStatus}
				recording={mode === "record"}
				refusal={refusal}
				onClose={onClose}
				onCreate={onCreate}
				onRetryLeaveTypes={onRetryLeaveTypes}
			/>
		);
	if (!request) return null;
	const fields = refusal?.fields ?? {};
	const rejecting = step === "reject";
	const rejectionReasonError = missingRejectionReason
		? t("leave.required")
		: fields.reason;
	// The API asks for a comment on leave before today; its own refusal lands on the field too.
	const commentRequired = request.startDate < today;
	const approvalCommentError = missingApprovalComment
		? t("leave.commentMissing")
		: fields.comment;
	const decide = (): void => {
		if (!rejecting) {
			if (commentRequired && !approvalComment.trim()) {
				setMissingApprovalComment(true);
				return;
			}
			onApprove(request, approvalComment.trim(), rosteredDays.length > 0);
			return;
		}
		if (!rejectionReason.trim()) {
			setMissingRejectionReason(true);
			return;
		}
		onReject(request, rejectionReason.trim());
	};
	return (
		<Modal
			open
			title={t("leave.requestTitle")}
			footer={
				step !== "review" ? (
					<>
						<Button
							variant="cancel"
							onClick={() => {
								setStep("review");
								setMissingRejectionReason(false);
							}}
						>
							{t("leave.cancel")}
						</Button>
						<Button
							form={id}
							leadingIcon={rejecting ? <CrossIcon /> : <TickIcon />}
							type="submit"
							variant={rejecting ? "danger" : "primary"}
							disabled={
								busy || (!rejecting && (unconfirmedClash || rosterUnknown))
							}
						>
							{t(
								rejecting ? "leave.confirmRejection" : "leave.confirmApproval"
							)}
						</Button>
					</>
				) : request.status === "PENDING" && canReview ? (
					<>
						<Button
							className="border-error-300! bg-error-50! text-error-600!"
							disabled={busy}
							leadingIcon={<CrossIcon />}
							variant="secondary"
							onClick={() => {
								setStep("reject");
							}}
						>
							{t("leave.reject")}
						</Button>
						<Button
							disabled={busy}
							leadingIcon={<TickIcon />}
							onClick={() => {
								setStep("approve");
							}}
						>
							{t("leave.approve")}
						</Button>
					</>
				) : (
					<Button variant="secondary" onClick={onClose}>
						{t("leave.close")}
					</Button>
				)
			}
			onClose={onClose}
		>
			<div className="px-6 py-8">
				{refusal?.message && (
					<p className="mb-6 text-sm text-error-700" role="alert">
						{refusal.message}
					</p>
				)}
				<LeaveRequestDetails request={request} />
				{lifecycle && step === "review" && (
					<LeaveRequestLifecycle
						canChange={canReview}
						companyId={lifecycle.companyId}
						own={lifecycle.own}
						request={request}
						onDone={lifecycle.onDone}
					/>
				)}
			</div>
			{step === "approve" && (rosteredDays.length > 0 || rostered.isError) && (
				<div className="border-t border-neutral-400 px-6 pt-6">
					<RosteredDaysNotice
						confirmed={takeOffConfirmed}
						days={rosteredDays}
						name={request.displayName}
						onConfirmedChange={setTakeOffConfirmed}
						onRetry={
							rostered.isError
								? (): void => {
										void rostered.refetch();
									}
								: undefined
						}
					/>
				</div>
			)}
			{step !== "review" && (
				<LeaveDecisionStep
					commentRequired={commentRequired}
					decision={step}
					error={rejecting ? rejectionReasonError : approvalCommentError}
					id={id}
					note={rejecting ? rejectionReason : approvalComment}
					onSubmit={decide}
					onNoteChange={(note) => {
						if (rejecting) {
							setRejectionReason(note);
							setMissingRejectionReason(false);
						} else {
							setApprovalComment(note);
							setMissingApprovalComment(false);
						}
					}}
				/>
			)}
		</Modal>
	);
};
