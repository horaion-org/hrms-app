import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
	DataTable,
	type DataTableColumn,
	type DataTableSort,
} from "@/components/ui/DataTable";
import { CrossIcon, TickIcon, ViewIcon } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Pagination";
import { formatPeriod } from "@/features/leave/dates";
import { statusTone, type LeaveRequest } from "@/features/leave/types";

export type LeaveRequestsProps = {
	requests: Array<LeaveRequest>;
	onOpen: (request: LeaveRequest, rejecting?: boolean) => void;
	onApprove: (request: LeaveRequest) => void;
};

export const LeaveRequests = ({
	requests,
	onOpen,
	onApprove,
}: LeaveRequestsProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [filter, setFilter] = useState("all");
	const [page, setPage] = useState(1);
	const [sort, setSort] = useState<DataTableSort>({ id: "", desc: false });
	const columns: Array<DataTableColumn<LeaveRequest>> = [
		{
			id: "employee",
			header: t("leaveUi.employee"),
			headerClassName: "min-w-51",
			sortValue: (row) => row.name,
			cell: (row) => (
				<div className="flex items-center gap-3">
					<Avatar className="size-10! text-base!" name={row.name} />
					<div>
						<p className="font-semibold">{row.name}</p>
						<p className="mt-1">{row.employeeId}</p>
					</div>
				</div>
			),
		},
		{
			id: "period",
			header: t("leaveUi.period"),
			headerClassName: "min-w-51",
			cell: (row) => (
				<div>
					<p className="font-semibold">
						{formatPeriod(row.start, row.end, i18n.language)}
					</p>
					<p className="mt-1">
						{t("leaveUi.requestedOn", {
							date: formatPeriod(row.requested, row.requested, i18n.language),
						})}
					</p>
				</div>
			),
		},
		{
			id: "duration",
			header: t("leaveUi.duration"),
			headerClassName: "min-w-28",
			cell: (row) => t("leaveUi.days", { count: row.days }),
		},
		{
			id: "type",
			header: t("leaveUi.type"),
			headerClassName: "min-w-40",
			sortValue: (row) => t(`leaveUi.types.${row.type}`),
			cell: (row) => t(`leaveUi.types.${row.type}`),
		},
		{
			id: "status",
			header: t("leaveUi.status"),
			headerClassName: "w-30",
			sortValue: (row) => t(`leaveUi.statuses.${row.status}`),
			cell: (row) => (
				<Badge className="text-xs!" tone={statusTone[row.status]}>
					{t(`leaveUi.statuses.${row.status}`)}
				</Badge>
			),
		},
		{
			id: "actions",
			header: t("leaveUi.actions"),
			headerClassName: "w-35",
			cell: (row) => (
				<div className="flex items-center gap-1">
					<Button
						aria-label={t("leaveUi.view", { name: row.name })}
						variant="icon"
						onClick={() => {
							onOpen(row);
						}}
					>
						<ViewIcon />
					</Button>
					<Button
						aria-label={t("leaveUi.rejectFor", { name: row.name })}
						disabled={row.status !== "pending"}
						variant="icon"
						onClick={() => {
							onOpen(row, true);
						}}
					>
						<CrossIcon />
					</Button>
					<Button
						aria-label={t("leaveUi.approveFor", { name: row.name })}
						disabled={row.status !== "pending"}
						variant="icon"
						onClick={() => {
							onApprove(row);
						}}
					>
						<TickIcon />
					</Button>
				</div>
			),
		},
	];
	const sortValue = columns.find((column) => column.id === sort.id)?.sortValue;
	const filtered = requests.filter(
		(request) => filter === "all" || request.status === filter
	);
	if (sortValue)
		filtered.sort(
			(left, right) =>
				String(sortValue(left)).localeCompare(
					String(sortValue(right)),
					i18n.language,
					{ numeric: true }
				) * (sort.desc ? -1 : 1)
		);
	const currentPage = Math.min(
		page,
		Math.max(1, Math.ceil(filtered.length / 10))
	);
	return (
		<section aria-label={t("leaveUi.requests")}>
			<div className="mb-8 flex items-center gap-3">
				<span className="text-sm font-medium text-neutral-800">
					{t("leaveUi.showing")}
				</span>
				<Select
					aria-label={t("leaveUi.showing")}
					className="w-44 font-semibold text-ink-blue-900"
					value={filter}
					options={[
						{ value: "all", label: t("leaveUi.all") },
						...(["approved", "pending", "rejected"] as const).map((value) => ({
							value,
							label: t(`leaveUi.statuses.${value}`),
						})),
					]}
					onChange={(value) => {
						setFilter(value);
						setPage(1);
					}}
				/>
			</div>
			<DataTable
				manualSorting
				className="[&>table]:min-w-250"
				columns={columns}
				data={filtered.slice((currentPage - 1) * 10, currentPage * 10)}
				emptyState={t("leaveUi.empty")}
				getRowId={(row) => row.id}
				label={t("leaveUi.requests")}
				sort={sort}
				onSortChange={(value) => {
					setSort(value);
					setPage(1);
				}}
			/>
			<Pagination
				page={currentPage}
				pageSize={10}
				total={filtered.length}
				onPageChange={setPage}
			/>
		</section>
	);
};
