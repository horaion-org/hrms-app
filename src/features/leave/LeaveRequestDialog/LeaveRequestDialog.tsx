import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { dateTimeFormatIn } from "@/common/dateTimeFormatIn";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { todayDate, type IsoDate } from "@/components/forms/Calendar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CrossIcon, TickIcon } from "@/components/ui/Icon";
import {
	APPROVAL_COMMENT_MAX_LENGTH,
	approvalInstanceQuery,
} from "@/features/approvals/api";
import { ApprovalTrail } from "@/features/approvals/ApprovalTrail";
import { rosteredDaysQuery } from "@/features/leave/api";
import {
	approvesLeave,
	leaveApprovalLine,
	leaveDecisionStage,
} from "@/features/leave/leaveApproval";
import type { DecisionField } from "@/features/leave/leaveRefusal";
import type { LeaveRequest } from "@/features/leave/types";
import type { Refusal } from "@/features/organisation/refusal";
import { LeaveApplyForm, type LeaveApplyFormInput } from "./LeaveApplyForm";
import { LeaveDecisionStep } from "./LeaveDecisionStep";
import { LeaveRequestDetails } from "./LeaveRequestDetails";
import { LeaveRequestLifecycle } from "./LeaveRequestLifecycle";
import { RosteredDaysNotice } from "./RosteredDaysNotice";

export type { ApplyEmployees, LeaveApplyFormInput } from "./LeaveApplyForm";

/** Where a review stands: reading the request, or confirming a decision with its note. */
type ReviewStep = "review" | "reject" | "approve";

/**
 * Deciding the shown request: what the reviewer may do and what the host
 * does with their decision. Without it the request is only read.
 */
export type LeaveReview = {
	/**
	 * Whether the person may decide the shown request now; Approve and Reject
	 * are offered only then. Under an approval flow, whether its open step
	 * waits on them.
	 */
	canReview: boolean;
	/**
	 * Whether the person reads approvals where the request's member is filed:
	 * a request under a flow then shows its steps and who decided them;
	 * otherwise only the step it waits on.
	 */
	readsApprovalSteps: boolean;
	/** While a decision is being sent. */
	busy: boolean;
	/** Why the last decision was refused: on the note's field, or as the dialog's alert. */
	refusal?: Refusal<DecisionField>;
	/** `comment` is trimmed, and empty when the reviewer wrote none. */
	onApprove: (
		request: LeaveRequest,
		comment: string,
		takeOffRosteredDays: boolean
	) => void;
	onReject: (request: LeaveRequest, reason: string) => void;
};

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
	/** Deciding the shown request; left out, it is only read. */
	review?: LeaveReview;
	/** The application's people, leave types and handlers, for `apply` and `record` modes. */
	applyForm?: LeaveApplyFormInput;
	onClose: () => void;
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
 * where its approval flow stands, the decision being confirmed
 * (`LeaveDecisionStep`) and the footer that moves between them. Under a
 * flow, a step before the last only moves the request on: the roster check
 * and the comment on past leave apply at the last step, which approves the
 * leave. An application is `LeaveApplyForm`.
 */
export const LeaveRequestDialog = ({
	request,
	mode = "view",
	lifecycle,
	review,
	applyForm,
	onClose,
	today: todayOverride,
}: LeaveRequestDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
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
	const canReview = review?.canReview ?? false;
	// Only the decision that approves the leave takes the person off their shifts.
	const checksRoster =
		lifecycle !== undefined &&
		request !== undefined &&
		step === "approve" &&
		approvesLeave(request);
	const rostered = useQuery(
		rosteredDaysQuery(
			lifecycle?.companyId ?? "",
			{ start: request?.startDate ?? "", end: request?.endDate ?? "" },
			request?.membershipId,
			checksRoster
		)
	);
	const rosteredDays = rostered.data ?? [];
	const unconfirmedClash = rosteredDays.length > 0 && !takeOffConfirmed;
	// Approving on days not read yet is how a 409 comes back with nothing to confirm.
	const rosterUnknown =
		checksRoster && (rostered.isFetching || rostered.isError);
	const approval =
		request?.status === "PENDING" ? (request.approval ?? null) : null;
	// The steps and who decided them, for someone who reads approvals there; never on the member's own request.
	const readsTrail =
		approval !== null &&
		lifecycle !== undefined &&
		!lifecycle.own &&
		review?.readsApprovalSteps === true;
	const trail = useQuery(
		approvalInstanceQuery(
			lifecycle?.companyId ?? "",
			readsTrail ? approval.approvalInstanceId : undefined
		)
	);
	if (mode === "apply" || mode === "record")
		return applyForm ? (
			<LeaveApplyForm
				{...applyForm}
				companyId={lifecycle?.companyId}
				recording={mode === "record"}
				onClose={onClose}
			/>
		) : null;
	if (!request) return null;
	const reviewRefusal = review?.refusal;
	const deciding = review?.busy ?? false;
	const fields = reviewRefusal?.fields ?? {};
	const rejecting = step === "reject";
	const stage = leaveDecisionStage(request);
	const rejectionReasonError = missingRejectionReason
		? t("leave.required")
		: fields.reason;
	// The API asks for a comment on leave before today; its own refusal lands on the field too.
	const commentRequired = approvesLeave(request) && request.startDate < today;
	const approvalCommentError = missingApprovalComment
		? t("leave.commentMissing")
		: fields.comment;
	const decide = (): void => {
		if (!review) return;
		if (!rejecting) {
			if (commentRequired && !approvalComment.trim()) {
				setMissingApprovalComment(true);
				return;
			}
			review.onApprove(
				request,
				approvalComment.trim(),
				rosteredDays.length > 0
			);
			return;
		}
		if (!rejectionReason.trim()) {
			setMissingRejectionReason(true);
			return;
		}
		review.onReject(request, rejectionReason.trim());
	};
	const approvalLine = leaveApprovalLine(request, canReview);
	const moment = dateTimeFormatIn(
		formattingLocale(i18n),
		request.branchTimeZone ?? "",
		{ dateStyle: "medium", timeStyle: "short" }
	);
	const stepNote =
		!approval || step === "review"
			? undefined
			: rejecting
				? t("leave.approval.rejectNote", {
						label: approval.currentStepLabel,
						name: request.displayName,
					})
				: stage === "middle"
					? t("leave.approval.middleNote", {
							step: approval.currentStepOrder,
							total: approval.stepCount,
							label: approval.currentStepLabel,
						})
					: t("leave.approval.lastNote", {
							label: approval.currentStepLabel,
							name: request.displayName,
						});
	return (
		<Dialog
			open
			title={t("leave.requestTitle")}
			footer={
				step !== "review" ? (
					<div className="flex justify-end gap-3">
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
								deciding || (!rejecting && (unconfirmedClash || rosterUnknown))
							}
						>
							{t(
								rejecting ? "leave.confirmRejection" : "leave.confirmApproval"
							)}
						</Button>
					</div>
				) : request.status === "PENDING" && canReview ? (
					<div className="flex justify-end gap-3">
						<Button
							className="border-error-300! bg-error-50! text-error-600!"
							disabled={deciding}
							leadingIcon={<CrossIcon />}
							variant="secondary"
							onClick={() => {
								setStep("reject");
							}}
						>
							{t("leave.reject")}
						</Button>
						<Button
							disabled={deciding}
							leadingIcon={<TickIcon />}
							onClick={() => {
								setStep("approve");
							}}
						>
							{t("leave.approve")}
						</Button>
					</div>
				) : undefined
			}
			onClose={onClose}
		>
			{reviewRefusal?.message && (
				<p className="mb-6 text-sm text-error-700" role="alert">
					{reviewRefusal.message}
				</p>
			)}
			<LeaveRequestDetails request={request} />
			{approval && (
				<section aria-labelledby={`${id}-approval`} className="mt-8">
					<h3
						className="text-sm font-semibold text-neutral-900"
						id={`${id}-approval`}
					>
						{t("leave.approval.title")}
					</h3>
					{trail.data ? (
						<ApprovalTrail
							className="mt-3"
							departmentName={request.departmentName ?? ""}
							formatMoment={(instant) => moment.format(new Date(instant))}
							instance={trail.data}
						/>
					) : (
						approvalLine && (
							<p className="mt-3 text-sm text-neutral-800">
								{t(approvalLine.key, approvalLine.values)}
							</p>
						)
					)}
					{trail.isError && (
						<p className="mt-2 text-sm text-neutral-700">
							{t("leave.approval.trailFailed")}{" "}
							<Button
								variant="textlink"
								onClick={() => {
									void trail.refetch();
								}}
							>
								{t("leave.approval.retry")}
							</Button>
						</p>
					)}
				</section>
			)}
			{lifecycle && step === "review" && (
				<LeaveRequestLifecycle
					canChange={canReview}
					companyId={lifecycle.companyId}
					own={lifecycle.own}
					request={request}
					onDone={lifecycle.onDone}
				/>
			)}
			{checksRoster && (rosteredDays.length > 0 || rostered.isError) && (
				<div className="mt-8 border-t border-neutral-400 pt-6">
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
					noteMaxLength={approval ? APPROVAL_COMMENT_MAX_LENGTH : undefined}
					stepNote={stepNote}
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
		</Dialog>
	);
};
