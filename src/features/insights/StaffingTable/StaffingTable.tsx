import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { StaffingRule } from "@/features/insights/api";

const key = "insights.staffing";

export type StaffingTableProps = {
	rules: Array<StaffingRule>;
};

/** A rule's row id: its department and name, unique within a company. */
const rowIdOf = (rule: StaffingRule): string =>
	`${rule.departmentId}|${rule.ruleName}`;

/**
 * Each staffing rule beside the people who could fill it: how many it asks
 * for on each shift, how many hold the job titles it counts, the shifts it
 * covers and the people short on them over the range. A department short
 * by design shows more needed than held, with gaps to match.
 */
export const StaffingTable = ({
	rules,
}: StaffingTableProps): FunctionComponent => {
	const { t } = useTranslation();
	const columns: Array<DataTableColumn<StaffingRule>> = [
		{
			id: "rule",
			header: t(`${key}.rule`),
			pin: "start",
			cell: (rule) => (
				<div className="flex flex-col gap-1">
					<span className="font-semibold">{rule.ruleName}</span>
					<span>
						{t(`scheduling.constraints.types.${rule.ruleType}`, {
							defaultValue: "",
						})}
					</span>
					<span>{rule.departmentName}</span>
				</div>
			),
			sortValue: (rule) => `${rule.departmentName} ${rule.ruleName}`,
		},
		{
			id: "jobTitles",
			header: t(`${key}.jobTitles`),
			cell: (rule) => rule.jobTitles.map((title) => title.name).join(", "),
		},
		{
			id: "needed",
			header: t(`${key}.needed`),
			cell: (rule) => rule.headcount,
			sortValue: (rule) => rule.headcount,
		},
		{
			id: "people",
			header: t(`${key}.people`),
			cell: (rule) => rule.peopleWithTitles,
			sortValue: (rule) => rule.peopleWithTitles,
		},
		{
			id: "shifts",
			header: t(`${key}.shifts`),
			hideBelow: "md",
			cell: (rule) =>
				rule.shifts
					.map((shift) =>
						t(`${key}.shiftDays`, { shift: shift.name, count: shift.daysAWeek })
					)
					.join(", "),
		},
		{
			id: "gaps",
			header: t(`${key}.gaps`),
			cell: (rule) => rule.gapsInRange,
			sortValue: (rule) => rule.gapsInRange,
		},
	];
	return (
		<DataTable
			columns={columns}
			data={rules}
			defaultSort={{ id: "gaps", desc: true }}
			emptyState={t(`${key}.empty`)}
			getRowId={rowIdOf}
			label={t(`${key}.title`)}
		/>
	);
};
