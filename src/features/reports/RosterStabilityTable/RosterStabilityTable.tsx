import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { RosterChangeDepartment } from "@/features/reports/api";

const key = "reports.stability";

export type RosterStabilityTableProps = {
	departments: Array<RosterChangeDepartment>;
};

/**
 * How much each department changed its rosters after publishing them, by
 * reason, over the weeks in the range. Fewer changes mean steadier rosters
 * for staff.
 */
export const RosterStabilityTable = ({
	departments,
}: RosterStabilityTableProps): FunctionComponent => {
	const { t } = useTranslation();
	const columns: Array<DataTableColumn<RosterChangeDepartment>> = [
		{
			id: "department",
			header: t(`${key}.department`),
			pin: "start",
			cell: (row) => (
				<div className="flex flex-col gap-1">
					<span className="font-semibold">{row.departmentName}</span>
					<span>{row.branchName}</span>
				</div>
			),
			sortValue: (row) => row.departmentName,
		},
		{
			id: "weeks",
			header: t(`${key}.weeks`),
			cell: (row) => row.publishedWeeks,
			sortValue: (row) => row.publishedWeeks,
		},
		{
			id: "changes",
			header: t(`${key}.changes`),
			cell: (row) => row.totalChanges,
			sortValue: (row) => row.totalChanges,
		},
		{
			id: "reasons",
			header: t(`${key}.reasons`),
			cell: (row) =>
				row.reasons.length === 0
					? t(`${key}.none`)
					: row.reasons
							.map((reason) =>
								t(`${key}.reason`, {
									reason: t(`${key}.reasonNames.${reason.reason}`, {
										defaultValue: t(`${key}.reasonNames.OTHER`),
									}),
									changes: reason.changes,
									count: reason.days,
								})
							)
							.join(", "),
		},
	];
	return (
		<DataTable
			columns={columns}
			data={departments}
			defaultSort={{ id: "changes", desc: true }}
			emptyState={t(`${key}.empty`)}
			getRowId={(row) => row.departmentId}
			label={t(`${key}.title`)}
		/>
	);
};
