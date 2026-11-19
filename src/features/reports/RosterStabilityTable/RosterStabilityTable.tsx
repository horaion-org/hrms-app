import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { SegmentedBar } from "@/components/charts/bar/SegmentedBar";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { RosterChangeDepartment } from "@/features/reports/api";
import { changeSegments } from "@/features/reports/reportCharts";

const key = "reports.stability";

export type RosterStabilityTableProps = {
	departments: Array<RosterChangeDepartment>;
};

/**
 * How much each department changed its rosters after publishing them, by
 * reason, over the weeks in the range: a bar split by reason, its length
 * against the department that changed most, and the reasons in words
 * beneath. Fewer changes mean steadier rosters for staff.
 */
export const RosterStabilityTable = ({
	departments,
}: RosterStabilityTableProps): FunctionComponent => {
	const { t } = useTranslation();
	const reasonLabel = (reason: string): string =>
		t(`${key}.reasonNames.${reason}`, {
			defaultValue: t(`${key}.reasonNames.OTHER`),
		});
	const mostChanges = Math.max(
		0,
		...departments.map((row) => row.totalChanges)
	);
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
			cell: (row): ReactNode =>
				row.reasons.length === 0 ? (
					t(`${key}.none`)
				) : (
					<div className="flex flex-col gap-2">
						<SegmentedBar
							scaleTo={mostChanges}
							segments={changeSegments(row.reasons, reasonLabel)}
							label={t(`${key}.barLabel`, {
								department: row.departmentName,
							})}
						/>
						<span>
							{row.reasons
								.map((reason) =>
									t(`${key}.reason`, {
										reason: reasonLabel(reason.reason),
										changes: reason.changes,
										count: reason.days,
									})
								)
								.join(", ")}
						</span>
					</div>
				),
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
