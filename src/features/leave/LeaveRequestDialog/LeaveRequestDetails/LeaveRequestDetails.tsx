import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatPeriod, requestedDayOf } from "@/features/leave/dates";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";
import { statusTone, type LeaveRequest } from "@/features/leave/types";

export type LeaveRequestDetailsProps = {
	request: LeaveRequest;
};

/**
 * One leave request as it stands: who it is for and its status, then the
 * period, who asked and when, its length and type, and whatever the API sent
 * of the remarks, the reviewer, the approval step that rejected it, the
 * rejection reason and the approval comment.
 */
export const LeaveRequestDetails = ({
	request,
}: LeaveRequestDetailsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	return (
		<>
			<div className="mb-10 flex flex-wrap items-start justify-between gap-4">
				<div className="flex items-center gap-5">
					<Avatar className="size-16! text-2xl!" name={request.displayName} />
					<div>
						<p className="font-semibold">{request.displayName}</p>
						<p className="mt-2 text-sm">{request.employeeCode}</p>
					</div>
				</div>
				<Badge className="mt-2 text-xs!" tone={statusTone[request.status]}>
					{t(`leave.statuses.${request.status}`)}
				</Badge>
			</div>
			<dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-5 gap-y-4 text-sm sm:text-base">
				<dt className="text-neutral-800">{t("leave.period")}</dt>
				<dd className="font-semibold">
					{formatPeriod(
						request.startDate,
						request.endDate,
						formattingLocale(i18n)
					)}
				</dd>
				<dt className="text-neutral-800">{t("leave.requested")}</dt>
				<dd className="font-semibold">
					{formatPeriod(
						requestedDayOf(request),
						requestedDayOf(request),
						formattingLocale(i18n)
					)}
				</dd>
				<dt className="text-neutral-800">{t("leave.requestedBy")}</dt>
				<dd className="font-semibold">{request.requestedBy.displayName}</dd>
				<dt className="text-neutral-800">{t("leave.duration")}</dt>
				<dd className="font-semibold">
					{t("leave.days", { count: request.workingDays })}
				</dd>
				<dt className="text-neutral-800">{t("leave.type")}</dt>
				<dd className="font-semibold">{leaveTypeLabel(request, t)}</dd>
				{request.notes && (
					<>
						<dt className="text-neutral-800">{t("leave.remarks")}</dt>
						<dd className="whitespace-pre-line break-words font-semibold">
							{request.notes}
						</dd>
					</>
				)}
				{request.reviewedBy && (
					<>
						<dt className="text-neutral-800">{t("leave.reviewedBy")}</dt>
						<dd className="font-semibold">{request.reviewedBy.displayName}</dd>
					</>
				)}
				{request.rejectedAtStep && (
					<>
						<dt className="text-neutral-800">
							{t("leave.approval.rejectedAt")}
						</dt>
						<dd className="font-semibold">
							{request.rejectedAtStep.stepLabel}
						</dd>
					</>
				)}
				{request.rejectionReason && (
					<>
						<dt className="text-neutral-800">{t("leave.reason")}</dt>
						<dd className="whitespace-pre-line break-words font-semibold">
							{request.rejectionReason}
						</dd>
					</>
				)}
				{request.approvalComment && (
					<>
						<dt className="text-neutral-800">{t("leave.approvalComment")}</dt>
						<dd className="whitespace-pre-line break-words font-semibold">
							{request.approvalComment}
						</dd>
					</>
				)}
			</dl>
		</>
	);
};
