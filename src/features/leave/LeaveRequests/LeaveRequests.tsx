import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { CrossIcon, TickIcon, ViewIcon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import {
	isLeaveSortField,
	isLeaveStatus,
	LEAVE_PAGE_SIZE,
	LEAVE_STATUSES,
	type LeaveSort,
	type LeaveStatus,
} from "@/features/leave/api";
import { formatPeriod } from "@/features/leave/dates";
import { statusTone, type LeaveRequest } from "@/features/leave/types";

export type LeaveRequestsProps = {
	/** The current page's rows, as the API sorted and filtered them. */
	rows: Array<LeaveRequest>;
	total: number;
	page: number;
	sort: LeaveSort;
	/** The status shown, or every status. */
	status?: LeaveStatus;
	onPageChange: (page: number) => void;
	onSortChange: (sort: LeaveSort) => void;
	onStatusChange: (status: LeaveStatus | undefined) => void;
	onOpen: (request: LeaveRequest, rejecting?: boolean) => void;
	onApprove: (request: LeaveRequest) => void;
	/** Whether the person may decide this request, as the workspace says. */
	canReview: (request: LeaveRequest) => boolean;
};

/**
 * The requests table: one server page, sorted, filtered and paged by the
 * API. Approve and Reject are offered only on pending requests the person
 * may decide; the API still checks every decision.
 */
export const LeaveRequests = ({
	rows,
	total,
	page,
	sort,
	status,
	onPageChange,
	onSortChange,
	onStatusChange,
	onOpen,
	onApprove,
	canReview,
}: LeaveRequestsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const columns: Array<DataTableColumn<LeaveRequest>> = [
		{
			id: "displayName",
			header: t("leave.employee"),
			headerClassName: "min-w-51",
			sortValue: (row) => row.displayName,
			cell: (row) => (
				<div className="flex items-center gap-3">
					<Avatar className="size-10! text-base!" name={row.displayName} />
					<div>
						<p className="font-semibold">{row.displayName}</p>
						<p className="mt-1">{row.employeeCode}</p>
					</div>
				</div>
			),
		},
		{
			id: "startDate",
			header: t("leave.period"),
			headerClassName: "min-w-51",
			sortValue: (row) => row.startDate,
			cell: (row) => (
				<div>
					<p className="font-semibold">
						{formatPeriod(row.startDate, row.endDate, i18n.language)}
					</p>
					<p className="mt-1">
						{t("leave.requestedOn", {
							date: formatPeriod(
								row.requestedAt.slice(0, 10),
								row.requestedAt.slice(0, 10),
								i18n.language
							),
						})}
					</p>
				</div>
			),
		},
		{
			id: "workingDays",
			header: t("leave.duration"),
			headerClassName: "min-w-28",
			cell: (row) => t("leave.days", { count: row.workingDays }),
		},
		{
			id: "leaveType",
			header: t("leave.type"),
			headerClassName: "min-w-40",
			sortValue: (row) => row.leaveType,
			cell: (row) => t(`leave.types.${row.leaveType}`),
		},
		{
			id: "status",
			header: t("leave.status"),
			headerClassName: "w-30",
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
			cell: (row): ReactNode => {
				const decidable = row.status === "PENDING" && canReview(row);
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
						<Button
							aria-label={t("leave.rejectFor", { name: row.displayName })}
							disabled={!decidable}
							variant="icon"
							onClick={() => {
								onOpen(row, true);
							}}
						>
							<CrossIcon />
						</Button>
						<Button
							aria-label={t("leave.approveFor", { name: row.displayName })}
							disabled={!decidable}
							variant="icon"
							onClick={() => {
								onApprove(row);
							}}
						>
							<TickIcon />
						</Button>
					</div>
				);
			},
		},
	];
	return (
		<section aria-label={t("leave.requests")}>
			<div className="mb-8 flex items-center gap-3">
				<span className="text-sm font-medium text-neutral-800">
					{t("leave.showing")}
				</span>
				<Select
					aria-label={t("leave.showing")}
					className="w-44 font-semibold text-ink-blue-900"
					value={status ?? "all"}
					options={[
						{ value: "all", label: t("leave.all") },
						...LEAVE_STATUSES.map((value) => ({
							value,
							label: t(`leave.statuses.${value}`),
						})),
					]}
					onChange={(value) => {
						onStatusChange(isLeaveStatus(value) ? value : undefined);
					}}
				/>
			</div>
			<DataTable
				manualSorting
				className="[&>table]:min-w-250"
				columns={columns}
				data={rows}
				emptyState={t("leave.empty")}
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
