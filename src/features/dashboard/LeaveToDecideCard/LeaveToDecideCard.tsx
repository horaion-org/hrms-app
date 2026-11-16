import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { ApproveRequestsIcon, CrossIcon, TickIcon } from "@/components/ui/Icon";
import {
	cardLinkClasses,
	failedLineClasses,
	rowListClasses,
} from "@/features/dashboard/cardStyles";
import { NotificationItem } from "@/features/dashboard/NotificationItem";
import type { LeaveRequest } from "@/features/leave/api";
import { formatPeriod } from "@/features/leave/dates";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";
import type { LeaveList } from "@/features/leave/useLeaveRequests";

const key = "dashboard.cards.leaveToDecide";

/** What the person does with a request from the card. */
export type LeaveStep = "view" | "approve" | "reject";

export type LeaveToDecideCardProps = {
	/** The leave waiting for a decision in the person's units, newest first. */
	pending: LeaveList;
	/** Whether the person may decide a request; nobody decides their own. */
	canDecide: (request: LeaveRequest) => boolean;
	/** Whether a decision is being sent, which holds the buttons. */
	busy: boolean;
	/** Opens a request to view, approve or reject. */
	onOpen: (request: LeaveRequest, step: LeaveStep) => void;
	className?: string;
};

/**
 * The leave waiting for a decision: each request with Approve and Reject
 * in place, five at a time, then a link to the whole list. Shown only
 * where leave may be read.
 */
export const LeaveToDecideCard = ({
	pending,
	canDecide,
	busy,
	onOpen,
	className,
}: LeaveToDecideCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	if (pending.status === "hidden") return null;
	return (
		<Card
			className={className}
			icon={ApproveRequestsIcon}
			title={t(`${key}.title`)}
		>
			{pending.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{pending.status === "ready" && (
				<ExpandableList
					itemClassName="py-4 first:pt-0 last:pb-0"
					items={pending.items}
					keyOf={(request) => request.leaveRequestId}
					listClassName={rowListClasses}
					renderItem={(request) => {
						const held = !canDecide(request) || busy;
						return (
							<NotificationItem
								detail={t(`${key}.detail`, {
									name: request.displayName,
									period: formatPeriod(
										request.startDate,
										request.endDate,
										language
									),
								})}
								primaryAction={{
									label: t(`${key}.approve`),
									icon: <TickIcon />,
									disabled: held,
									onClick: () => {
										onOpen(request, "approve");
									},
								}}
								secondaryAction={{
									label: t(`${key}.reject`),
									icon: <CrossIcon />,
									disabled: held,
									onClick: () => {
										onOpen(request, "reject");
									},
								}}
								tag={
									// Under an approval flow, the step it waits on, beside its title.
									request.approval
										? t("approvals.meta.stepShort", {
												step: request.approval.currentStepOrder,
												total: request.approval.stepCount,
											})
										: undefined
								}
								title={t(`${key}.request`, {
									type: leaveTypeLabel(request, t),
								})}
								onOpen={() => {
									onOpen(request, "view");
								}}
							/>
						);
					}}
					seeAll={
						<Link
							className={cardLinkClasses}
							search={{ view: "requests" }}
							to="/leave"
						>
							{t(`${key}.seeAll`, { count: pending.total })}
						</Link>
					}
				/>
			)}
		</Card>
	);
};
