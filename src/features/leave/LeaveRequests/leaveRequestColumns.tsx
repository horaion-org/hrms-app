import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import { joinClassNames } from "@/common/joinClassNames";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { CrossIcon, TickIcon, ViewIcon } from "@/components/ui/Icon";
import { formatPeriod, requestedDayOf } from "@/features/leave/dates";
import { amountText, portionText } from "@/features/leave/dayPortion";
import { leaveApprovalLine } from "@/features/leave/leaveApproval";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";
import { statusTone, type LeaveRequest } from "@/features/leave/types";

export type LeaveRequestColumnsOptions = {
	/** The locale dates are written in. */
	locale: string;
	/** The caller's own requests: no employee column, no decisions, only viewing. */
	own: boolean;
	/** Whether this page has remarks to show; the API serves them only to people allowed to read them. */
	showRemarks: boolean;
	/** Whether the person may decide this request now. */
	canReview: (request: LeaveRequest) => boolean;
	/** Opens the request, straight at a decision's confirmation step when one is named. */
	onOpen: (request: LeaveRequest, decision?: "reject" | "approve") => void;
};

/**
 * The requests table's columns: who asked (unless they are the caller's own),
 * the period, duration, type, remarks when the page has any, the status with
 * the approval step it waits on, and View / Reject / Approve. On a phone it
 * keeps who (or, for the caller's own, when), the status and the actions.
 */
export const leaveRequestColumns = (
	t: TFunction,
	{ locale, own, showRemarks, canReview, onOpen }: LeaveRequestColumnsOptions
): Array<DataTableColumn<LeaveRequest>> => {
	const statusBadge = (row: LeaveRequest): ReactNode => (
		<Badge className="shrink-0 text-xs!" tone={statusTone[row.status]}>
			{t(`leave.statuses.${row.status}`)}
		</Badge>
	);
	// Under an approval flow, the step it waits on; in bold when it waits on the reader.
	const approvalNote = (row: LeaveRequest, className?: string): ReactNode => {
		const callersTurn = !own && canReview(row);
		const line = leaveApprovalLine(row, callersTurn);
		return (
			line && (
				<span
					className={joinClassNames(
						"text-xs text-neutral-800",
						callersTurn && "font-semibold",
						className
					)}
				>
					{t(line.key, line.values)}
				</span>
			)
		);
	};
	const employee: Array<DataTableColumn<LeaveRequest>> = own
		? []
		: [
				{
					id: "displayName",
					header: t("leave.employee"),
					headerClassName: "sm:min-w-51",
					pin: "start",
					sortValue: (row) => row.displayName,
					cell: (row) => (
						<div className="flex items-center gap-3">
							<Avatar
								className="size-10! text-base! max-sm:hidden"
								name={row.displayName}
							/>
							<div>
								<p className="font-semibold">{row.displayName}</p>
								<p className="mt-1">{row.employeeCode}</p>
							</div>
						</div>
					),
				},
			];
	const remarks: Array<DataTableColumn<LeaveRequest>> = showRemarks
		? [
				{
					id: "notes",
					header: t("leave.remarks"),
					headerClassName: "min-w-48",
					hideBelow: "md",
					// One tap away for every reader: View shows the remarks in full.
					omitFromSummary: true,
					cell: (row) =>
						row.notes === null ? (
							<>
								<span aria-hidden="true">—</span>
								<span className="sr-only">{t("leave.noRemarks")}</span>
							</>
						) : (
							<p className="max-w-56 truncate">{row.notes}</p>
						),
				},
			]
		: [];
	const periodOf = (row: LeaveRequest): string =>
		formatPeriod(row.startDate, row.endDate, locale);
	const requestedOnOf = (row: LeaveRequest): string =>
		t("leave.requestedOn", {
			date: formatPeriod(requestedDayOf(row), requestedDayOf(row), locale),
		});
	return [
		...employee,
		{
			id: "startDate",
			header: t("leave.period"),
			headerClassName: "sm:min-w-51",
			// The caller's own requests are told apart by their dates; a team's by who asked.
			hideBelow: own ? undefined : "sm",
			sortValue: (row) => row.startDate,
			cell: (row) => (
				<div>
					<p className="font-semibold">{periodOf(row)}</p>
					{portionText(row, t) && <p>{portionText(row, t)}</p>}
					<p className="mt-1">{requestedOnOf(row)}</p>
				</div>
			),
			// On the name's line, the period and any part of the day; the request day is in View, one tap away.
			summary: (row) => (
				<span className="flex flex-wrap gap-x-1">
					<span className="font-semibold whitespace-nowrap">
						{periodOf(row)}
					</span>
					{portionText(row, t) && (
						<span className="whitespace-nowrap">{portionText(row, t)}</span>
					)}
				</span>
			),
		},
		{
			id: "workingDays",
			header: t("leave.duration"),
			headerClassName: "min-w-28",
			hideBelow: "md",
			cell: (row) => amountText(row, t),
		},
		{
			id: "leaveType",
			header: t("leave.type"),
			headerClassName: "min-w-40",
			hideBelow: own ? "sm" : "md",
			sortValue: (row) => leaveTypeLabel(row, t),
			cell: (row) => leaveTypeLabel(row, t),
		},
		...remarks,
		{
			id: "status",
			header: t("leave.status"),
			headerClassName: "w-30",
			hideBelow: own ? undefined : "sm",
			sortValue: (row) => row.status,
			cell: (row): ReactNode => (
				<>
					{statusBadge(row)}
					{approvalNote(row, "mt-1 block")}
				</>
			),
			// On a phone's name line the badge stays whole and the step wraps after it.
			summary: (row): ReactNode => (
				<span className="flex flex-wrap items-center gap-x-2 gap-y-1">
					{statusBadge(row)}
					{approvalNote(row)}
				</span>
			),
		},
		{
			id: "actions",
			header: t("leave.actions"),
			headerClassName: "w-35",
			pin: "end",
			cell: (row): ReactNode => {
				const decidable = !own && row.status === "PENDING" && canReview(row);
				return (
					<div className="flex items-center gap-1">
						<Button
							aria-label={t("leave.view", { name: row.displayName })}
							variant="icon"
							onClick={() => {
								onOpen(row);
							}}
						>
							<ViewIcon />
						</Button>
						{!own && (
							<>
								<Button
									aria-label={t("leave.rejectFor", { name: row.displayName })}
									disabled={!decidable}
									variant="icon"
									onClick={() => {
										onOpen(row, "reject");
									}}
								>
									<CrossIcon />
								</Button>
								<Button
									aria-label={t("leave.approveFor", { name: row.displayName })}
									disabled={!decidable}
									variant="icon"
									onClick={() => {
										onOpen(row, "approve");
									}}
								>
									<TickIcon />
								</Button>
							</>
						)}
					</div>
				);
			},
		},
	];
};
