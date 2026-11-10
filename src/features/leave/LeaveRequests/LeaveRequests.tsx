import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { DataTable } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import {
	isLeaveSortField,
	LEAVE_PAGE_SIZE,
	type LeaveSort,
} from "@/features/leave/api";
import { leaveRequestColumns } from "@/features/leave/LeaveRequests/leaveRequestColumns";
import type { LeaveRequest } from "@/features/leave/types";

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
	/** Whether the person may decide this request now: their review key, or, under an approval flow, their turn. */
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
	const columns = leaveRequestColumns(t, {
		locale: formattingLocale(i18n),
		own,
		showRemarks: rows.some((row) => row.notes !== null),
		canReview,
		onOpen,
	});
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
