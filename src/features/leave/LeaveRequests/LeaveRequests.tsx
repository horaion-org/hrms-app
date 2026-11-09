import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { CrossIcon, TickIcon, ViewIcon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import {
	isLeaveSortField,
	LEAVE_PAGE_SIZE,
	type LeaveSort,
} from "@/features/leave/api";
import { formatPeriod, requestedDayOf } from "@/features/leave/dates";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";
import { statusTone, type LeaveRequest } from "@/features/leave/types";

export type LeaveRequestsProps = {
	/** The current page's rows, as the API sorted and filtered them. */
	rows: Array<LeaveRequest>;
	total: number;
	page: number;
	sort: LeaveSort;
	onPageChange: (page: number) => void;
	onSortChange: (sort: LeaveSort) => void;
	/** Opens the request, straight at a decision's confirmation step when one is named. */
	onOpen: (request: LeaveRequest, decision?: "reject" | "approve") => void;
	/** Whether the person may decide this request, as the workspace says. */
	canReview: (request: LeaveRequest) => boolean;
	/** The caller's own requests: no employee column, no decisions, only viewing. */
	own?: boolean;
	emptyState?: string;
};

/**
 * The requests table: one server page, sorted, filtered and paged by the
 * API. Approve and Reject are offered only on pending requests the person
 * may decide, and each opens the request at its confirmation step; the API
 * still checks every decision. On a phone it keeps who (or, for the
 * caller's own, when), the status and the actions; the rest of a request
 * is one tap away in View.
 */
export const LeaveRequests = ({
	rows,
	total,
	page,
	sort,
	onPageChange,
	onSortChange,
	onOpen,
	canReview,
	own = false,
	emptyState,
}: LeaveRequestsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
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
	// The API serves remarks only to people allowed to read them, so the column shows only when this page has some.
	const remarks: Array<DataTableColumn<LeaveRequest>> = rows.some(
		(row) => row.notes !== null
	)
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
		formatPeriod(row.startDate, row.endDate, formattingLocale(i18n));
	const requestedOnOf = (row: LeaveRequest): string =>
		t("leave.requestedOn", {
			date: formatPeriod(
				requestedDayOf(row),
				requestedDayOf(row),
				formattingLocale(i18n)
			),
		});
	const columns: Array<DataTableColumn<LeaveRequest>> = [
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
					<p className="mt-1">{requestedOnOf(row)}</p>
				</div>
			),
			// On the name's line, the period alone on one line; the request day is in View, one tap away.
			summary: (row) => (
				<span className="font-semibold whitespace-nowrap">{periodOf(row)}</span>
			),
		},
		{
			id: "workingDays",
			header: t("leave.duration"),
			headerClassName: "min-w-28",
			hideBelow: "md",
			cell: (row) => t("leave.days", { count: row.workingDays }),
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
			cell: (row) => (
				<Badge className="text-xs!" tone={statusTone[row.status]}>
					{t(`leave.statuses.${row.status}`)}
				</Badge>
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
	return (
		<section aria-label={t("leave.requests")}>
			<DataTable
				manualSorting
				// Every column needs this width; below `md` the priority columns need less.
				className="md:[&>table]:min-w-300"
				columns={columns}
				data={rows}
				emptyState={emptyState ?? t("leave.empty")}
				getRowId={(row) => row.leaveRequestId}
				label={t("leave.requests")}
				sort={{ id: sort.field, desc: sort.desc }}
				onSortChange={({ id, desc }) => {
					if (isLeaveSortField(id)) onSortChange({ field: id, desc });
				}}
			/>
			{total > 0 && (
				<Pagination
					page={page}
					pageSize={LEAVE_PAGE_SIZE}
					total={total}
					onPageChange={onPageChange}
				/>
			)}
		</section>
	);
};
