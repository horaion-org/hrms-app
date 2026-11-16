import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { OvertimeDepartment } from "@/features/dashboard/api";
import { hoursLabel } from "@/features/dashboard/dashboardDates";

const key = "insights.overtime";

export type OvertimeTableProps = {
	departments: Array<OvertimeDepartment>;
	/** The share of the ceiling at which a person counts as near it. */
	nearSharePercent: number;
};

/** A row's id: the department and its month. */
const rowIdOf = (row: OvertimeDepartment): string =>
	`${row.departmentId}|${row.month}`;

/** "2026-11" as the page writes a month, e.g. "Nov 2026". */
const monthLabel = (month: string, language: string): string =>
	new Intl.DateTimeFormat(language, { month: "short", year: "numeric" }).format(
		new Date(`${month}-01T00:00:00`)
	);

/**
 * Overtime by department and month against the company's monthly ceiling,
 * from the hours rostered, with the people at or over the share of it.
 */
export const OvertimeTable = ({
	departments,
	nearSharePercent,
}: OvertimeTableProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const columns: Array<DataTableColumn<OvertimeDepartment>> = [
		{
			id: "department",
			header: t(`${key}.department`),
			pin: "start",
			cell: (row) => (
				<div className="flex flex-col gap-1">
					<span className="font-semibold">{row.departmentName}</span>
					<span>{monthLabel(row.month, language)}</span>
				</div>
			),
			sortValue: (row) => `${row.month} ${row.departmentName}`,
		},
		{
			id: "overtime",
			header: t(`${key}.overtime`),
			cell: (row) =>
				t(`${key}.hours`, { hours: hoursLabel(row.overtimeMinutes, language) }),
			sortValue: (row) => row.overtimeMinutes,
		},
		{
			id: "ceiling",
			header: t(`${key}.ceiling`),
			cell: (row) =>
				row.ceilingMinutes === null
					? t(`${key}.noCeiling`)
					: t(`${key}.hours`, {
							hours: hoursLabel(row.ceilingMinutes, language),
						}),
		},
		{
			id: "people",
			header: t(`${key}.people`, { share: nearSharePercent }),
			cell: (row) =>
				row.members.length === 0
					? t(`${key}.nobody`)
					: row.members
							.map((member) =>
								t(`${key}.person`, {
									name: member.displayName ?? t(`${key}.formerMember`),
									hours: hoursLabel(member.overtimeMinutes, language),
									standing: t(`${key}.standing.${member.standing}`),
								})
							)
							.join(", "),
		},
	];
	return (
		<DataTable
			columns={columns}
			data={departments}
			defaultSort={{ id: "overtime", desc: true }}
			emptyState={t(`${key}.empty`)}
			getRowId={rowIdOf}
			label={t(`${key}.title`)}
		/>
	);
};
