import { useState } from "react";
import { useTranslation } from "react-i18next";
import { approvedMessage } from "@/features/leave/leaveApproval";
import type { LeaveReview } from "@/features/leave/LeaveRequestDialog";
import {
	leaveDecisionRefusal,
	type DecisionField,
} from "@/features/leave/leaveRefusal";
import type { LeaveRequest } from "@/features/leave/types";
import { useLeaveDecisionActions } from "@/features/leave/useLeaveActions";
import { useLeaveTurns } from "@/features/leave/useLeaveRequests";
import type { Refusal } from "@/features/organisation/refusal";

export type LeaveDecisionOptions = {
	/** The host says the outcome itself, so the app's success toast stays quiet. */
	ownConfirmation?: boolean;
	/** Called with what to tell the reviewer once the API accepted a decision; the refusal is cleared first. */
	onDecided: (message: string) => void;
};

export type LeaveDecisionControls = {
	/** Whether the caller may approve or reject the request now, e.g. for a list's row actions. */
	canDecide: (request: LeaveRequest) => boolean;
	/** While a decision is being sent. */
	busy: boolean;
	/** Everything `LeaveRequestDialog` needs to decide `request`. */
	reviewOf: (request: LeaveRequest) => LeaveReview;
	/** Forgets the last refusal; called when the dialog closes. */
	clearRefusal: () => void;
};

/**
 * Approving and rejecting leave from any screen: whose turn it is, the two
 * mutations, why the last one was refused, and the line that tells the
 * reviewer what happened. The host only decides what to do with that line
 * (a status line, a toast, closing).
 */
export const useLeaveDecision = (
	companyId: string,
	{ ownConfirmation = false, onDecided }: LeaveDecisionOptions
): LeaveDecisionControls => {
	const { t } = useTranslation();
	const actions = useLeaveDecisionActions(companyId, { ownConfirmation });
	const turns = useLeaveTurns(companyId);
	const [refusal, setRefusal] = useState<Refusal<DecisionField>>();
	const refused = (error: Error): void => {
		setRefusal(leaveDecisionRefusal(error, t));
	};
	const decided = (message: string): void => {
		setRefusal(undefined);
		onDecided(message);
	};
	const busy = actions.approve.isPending || actions.reject.isPending;
	const approve = (
		request: LeaveRequest,
		comment: string,
		takeOffRosteredDays: boolean
	): void => {
		actions.approve.mutate(
			{ request, comment, takeOffRosteredDays },
			{
				onSuccess: () => {
					decided(approvedMessage(request, t));
				},
				onError: refused,
			}
		);
	};
	const reject = (request: LeaveRequest, reason: string): void => {
		actions.reject.mutate(
			{ request, reason },
			{
				onSuccess: () => {
					decided(t("leave.rejected", { name: request.displayName }));
				},
				onError: refused,
			}
		);
	};
	return {
		canDecide: turns.canDecide,
		busy,
		reviewOf: (request): LeaveReview => ({
			canReview: turns.canDecide(request),
			readsApprovalSteps: turns.readsApprovalSteps(request),
			busy,
			refusal,
			onApprove: approve,
			onReject: reject,
		}),
		clearRefusal: (): void => {
			setRefusal(undefined);
		},
	};
};
