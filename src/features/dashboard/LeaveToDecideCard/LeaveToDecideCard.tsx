import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { ApproveRequestsIcon } from "@/components/ui/Icon";
import {
	failedLineClasses,
	HOME_ROW_COUNT,
	rowClasses,
	rowLeadClasses,
	rowListClasses,
	rowTextClasses,
} from "@/features/dashboard/cardStyles";
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
	/** Opens a request, where it is approved or rejected. */
	onOpen: (request: LeaveRequest, step: LeaveStep) => void;
	className?: string;
};

/**
 * The leave waiting for a decision, a line each: who, which leave and
 * when, with one action that opens the request to approve or reject it.
 * Three at a time, then a link to the whole list. Shown only where leave
 * may be read.
 */
export const LeaveToDecideCard = ({
	pending,
	canDecide,
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
					collapsedCount={HOME_ROW_COUNT}
					itemClassName={rowClasses}
					items={pending.items}
					keyOf={(request) => request.leaveRequestId}
					listClassName={rowListClasses}
					renderItem={(request) => {
						const type = leaveTypeLabel(request, t);
						// A request waiting on someone else's step can only be looked at.
						const action = canDecide(request) ? "review" : "view";
						return (
							<>
								<span className={rowTextClasses}>
									<span className={rowLeadClasses}>{request.displayName}</span>
									{" · "}
									{type}
									{" · "}
									{formatPeriod(request.startDate, request.endDate, language)}
								</span>
								<Button
									className="shrink-0"
									variant="textlink"
									aria-label={t(`${key}.${action}Named`, {
										name: request.displayName,
										type,
									})}
									onClick={() => {
										onOpen(request, "view");
									}}
								>
									{t(`${key}.${action}`)}
								</Button>
							</>
						);
					}}
					seeAll={
						<Button
							className="self-start"
							search={{ view: "requests" }}
							to="/leave"
							variant="hyperlink"
						>
							{t(`${key}.seeAll`, { count: pending.total })}
						</Button>
					}
				/>
			)}
		</Card>
	);
};
