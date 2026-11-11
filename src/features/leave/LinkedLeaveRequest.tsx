import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Dialog } from "@/components/ui/Dialog";
import { leaveRequestQuery } from "@/features/leave/api";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { useLeaveDecision } from "@/features/leave/useLeaveDecision";
import { useAccess } from "@/features/workspace/useAccess";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/workspace/useCurrentCompany";

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
	// A decision closes the linked request; the app's toast says what happened.
	const decision = useLeaveDecision(companyId, { onDecided: onClose });
	if (!allowed || query.isError || !query.data)
		return (
			<Dialog open title={t("notifications.leaveRequest")} onClose={onClose}>
				<p role={query.isError || !allowed ? "alert" : undefined}>
					{t(
						query.isError || !allowed
							? "notifications.targetUnavailable"
							: "notifications.loading"
					)}
				</p>
			</Dialog>
		);
	const request = query.data;
	return (
		<LeaveRequestDialog
			lifecycle={{ companyId, own: memberId === undefined, onDone: onClose }}
			request={request}
			review={decision.reviewOf(request)}
			onClose={onClose}
		/>
	);
};
