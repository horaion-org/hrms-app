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
} from "@/features/leave/leaveRefusal";
import { useLeaveActions } from "@/features/leave/useLeaveRequests";
import type { Refusal } from "@/features/organisation/refusal";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";
import { recordScope } from "@/features/workspace/scopes";
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
	const actions = useLeaveActions(companyId);
	const [refusal, setRefusal] = useState<Refusal<ApplyField | "reason">>();
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
			busy={actions.approve.isPending || actions.reject.isPending}
			refusal={refusal}
			request={request}
			canReview={
				request.membershipId !== ownMembershipId &&
				access.can("leave_request:review", recordScope(request.departmentId))
			}
			onClose={onClose}
			onCreate={() => {}}
			onApprove={(record) => {
				actions.approve.mutate(record, { onSuccess: onClose, onError: failed });
			}}
			onReject={(record, reason) => {
				actions.reject.mutate(
					{ request: record, reason },
					{ onSuccess: onClose, onError: failed }
				);
			}}
		/>
	);
};
