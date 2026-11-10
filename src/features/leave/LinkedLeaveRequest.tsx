import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Modal } from "@/components/ui/Modal";
import { leaveRequestQuery } from "@/features/leave/api";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import {
	decisionRefusal,
	type ApplyField,
	type DecisionField,
} from "@/features/leave/leaveRefusal";
import { useLeaveDecisionActions } from "@/features/leave/useLeaveActions";
import { useLeaveTurns } from "@/features/leave/useLeaveRequests";
import type { Refusal } from "@/features/organisation/refusal";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";
import { useAccess } from "@/features/workspace/useAccess";

export const LinkedLeaveRequest = ({
	requestId,
	memberId,
	onClose,
}: {
	requestId: string;
	memberId?: string;
	onClose: () => void;
}): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const ownMembershipId = useCurrentMembershipId();
	const access = useAccess();
	const { t } = useTranslation();
	const allowed = !memberId || access.canAnywhere("leave_request:read");
	const query = useQuery({
		...leaveRequestQuery(companyId, ownMembershipId, requestId, memberId),
		enabled: allowed,
	});
	const actions = useLeaveDecisionActions(companyId);
	const turns = useLeaveTurns(companyId);
	const [refusal, setRefusal] = useState<Refusal<ApplyField | DecisionField>>();
	const failed = (error: Error): void => {
		setRefusal(decisionRefusal(error, t));
	};
	if (!allowed || query.isError || !query.data)
		return (
			<Modal open title={t("notifications.leaveRequest")} onClose={onClose}>
				<p role={query.isError || !allowed ? "alert" : undefined}>
					{t(
						query.isError || !allowed
							? "notifications.targetUnavailable"
							: "notifications.loading"
					)}
				</p>
			</Modal>
		);
	const request = query.data;
	return (
		<LeaveRequestDialog
			lifecycle={{ companyId, own: memberId === undefined, onDone: onClose }}
			request={request}
			review={{
				canReview: turns.canDecide(request),
				readsApprovalSteps: turns.readsApprovalSteps(request),
				busy: actions.approve.isPending || actions.reject.isPending,
				refusal,
				onApprove: (record, comment, takeOffRosteredDays) => {
					actions.approve.mutate(
						{ request: record, comment, takeOffRosteredDays },
						{ onSuccess: onClose, onError: failed }
					);
				},
				onReject: (record, reason) => {
					actions.reject.mutate(
						{ request: record, reason },
						{ onSuccess: onClose, onError: failed }
					);
				},
			}}
			onClose={onClose}
		/>
	);
};
