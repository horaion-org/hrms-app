import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { SegmentedBar } from "@/components/charts/bar/SegmentedBar";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type {
	OverviewGrouping,
	OverviewUnit,
} from "@/features/reports/overview";
import { STANDING_TONES } from "@/features/reports/standingTones";

const key = "reports.overview.units";

/** A header that reads in full on two or three lines, never a word a line, however narrow the screen. */
const wrappedHeaderClasses = "min-w-30";

/** The column that needs the roster read. */
const NEXT_WEEK_COLUMN = "nextWeek";

export type OverviewUnitsTableProps = {
	/** Each unit's row, the one to act on first. */
	units: Array<OverviewUnit>;
	/** Whether the rows are Branches or the Departments of one Branch. */
	grouping: OverviewGrouping;
	/** Whether the person may read rosters; without it the next-week column is left out. */
	rostersInReach: boolean;
};

/**
 * Each Branch, or each Department of the Branch in view, in one row: how it
 * stands, then what is wrong there and how badly, so the unit that needs
 * attention is the first one read.
 */
export const OverviewUnitsTable = ({
	units,
	grouping,
	rostersInReach,
}: OverviewUnitsTableProps): FunctionComponent => {
	const { t } = useTranslation();
	const columns: Array<DataTableColumn<OverviewUnit>> = [
		{
			id: "unit",
			header: t(`${key}.unit.${grouping}`),
			pin: "start",
			cellClassName: "font-semibold",
			cell: (unit) => unit.name,
		},
		{
			id: "standing",
			header: t(`${key}.standing`),
			cell: (unit): ReactNode => (
				<Badge tone={STANDING_TONES[unit.standing]}>
					{t(`reports.overview.standings.${unit.standing}`)}
				</Badge>
			),
		},
		{
			id: "peopleShort",
			header: t(`${key}.peopleShort`),
			wrapHeader: true,
			headerClassName: wrappedHeaderClasses,
			cell: (unit) => unit.peopleShort,
		},
		{
			id: "rulesShort",
			header: t(`${key}.rulesShort`),
			wrapHeader: true,
			headerClassName: wrappedHeaderClasses,
			hideBelow: "md",
			// On the row's summary line a unit with no such rule says nothing.
			summary: (unit) =>
				unit.rulesShort.map((rule) => rule.ruleName).join(", "),
			cell: (unit) =>
				unit.rulesShort.length === 0
					? t(`${key}.none`)
					: unit.rulesShort.map((rule) => rule.ruleName).join(", "),
		},
		{
			id: "overtime",
			header: t(`${key}.overtime`),
			wrapHeader: true,
			headerClassName: wrappedHeaderClasses,
			cell: (unit) =>
				t(`${key}.overAndNear`, {
					over: unit.overLimit,
					near: unit.nearLimit,
				}),
		},
		{
			id: NEXT_WEEK_COLUMN,
			header: t(`${key}.nextWeek`),
			cell: (unit): ReactNode =>
				unit.rosters === 0 ? (
					t(`${key}.none`)
				) : (
					<div className="flex flex-col gap-1">
						<SegmentedBar
							label={t(`${key}.nextWeekOf`, { unit: unit.name })}
							segments={[
								{
									id: "published",
									label: t(`${key}.published`),
									colour: "inkBlue900",
									value: unit.published,
								},
								{
									id: "toDo",
									label: t(`${key}.toDo`),
									colour: "neutral400",
									value: unit.rosters - unit.published,
								},
							]}
						/>
						<span>
							{t(`${key}.publishedOf`, {
								published: unit.published,
								count: unit.rosters,
							})}
						</span>
					</div>
				),
		},
		{
			id: "changes",
			header: t(`${key}.changes`),
			wrapHeader: true,
			headerClassName: wrappedHeaderClasses,
			hideBelow: "md",
			// On the row's summary line the count says what it counts; none says nothing.
			summary: (unit) =>
				unit.changes === 0
					? undefined
					: t(`${key}.changesSummary`, { count: unit.changes }),
			cell: (unit) => unit.changes,
		},
	];
	return (
		<DataTable
			data={units}
			getRowId={(unit) => unit.name}
			label={t(`${key}.title.${grouping}`)}
			columns={
				rostersInReach
					? columns
					: columns.filter((column) => column.id !== NEXT_WEEK_COLUMN)
			}
		/>
	);
};
