import { mondayOf, weeksOf } from "@/common/weeks";
import type { BarSegment } from "@/components/charts/bar/SegmentedBar";
import type {
	ChartColumn,
	ColumnGroup,
} from "@/components/charts/bar/ColumnChart";
import type { ChartColour } from "@/components/charts/chartColours";
import type {
	DayRange,
	OvertimeDepartment,
	Shortage,
	StaffingRule,
} from "@/features/dashboard/api";
import {
	unstaffableRuleOf,
	unstaffableRulesOf,
} from "@/features/dashboard/shortCauses";
import type { RosterChangeReasonCount } from "@/features/reports/api";

/*
 * What each Reports chart draws, worked out from the reads. Pure: the page
 * passes the result to the chart components and supplies the words.
 */

/** What the charts compare: Branches across the company, or the Departments of one Branch. */
export type UnitGrouping = "branch" | "department";

/** A row that names the units it belongs to. */
type InUnit = { branchName: string; departmentName: string };

/** The unit a row counts under. */
const unitOf = (row: InUnit, grouping: UnitGrouping): string =>
	grouping === "branch" ? row.branchName : row.departmentName;

/** The series ids of the people-short chart, by cause. */
export const SHORT_SERIES = { tooFew: "tooFew", oneOff: "oneOff" } as const;

/** A group's amount across its columns and series, for putting the largest first. */
const totalOf = (group: ColumnGroup): number =>
	group.columns.reduce(
		(sum, column) =>
			sum + Object.values(column.values).reduce((a, b) => a + b, 0),
		0
	);

/** Largest first, then by name, so the unit that needs attention leads. */
const largestFirst = (first: ColumnGroup, second: ColumnGroup): number =>
	totalOf(second) - totalOf(first) ||
	(first.title ?? "").localeCompare(second.title ?? "");

/**
 * People short each week of the range, one chart per unit, split by cause:
 * under a rule too few people can staff, or a one-off gap. A unit with
 * staffing rules and nothing short shows as a row of zeros, which is the
 * comparison worth seeing.
 */
export const shortByWeekGroups = (
	shortages: ReadonlyArray<Shortage>,
	rules: ReadonlyArray<StaffingRule>,
	range: DayRange,
	grouping: UnitGrouping,
	weekLabel: (monday: string) => string
): Array<ColumnGroup> => {
	const unstaffable = unstaffableRulesOf(rules);
	const mondays = weeksOf({ start: range.from, end: range.to }).map(
		(week) => week.start
	);
	const units = new Set(
		[...rules, ...shortages].map((row) => unitOf(row, grouping))
	);
	return [...units]
		.map((unit): ColumnGroup => {
			const inUnit = shortages.filter(
				(shortage) => unitOf(shortage, grouping) === unit
			);
			return {
				id: unit,
				title: unit,
				columns: mondays.map((monday): ChartColumn => {
					const inWeek = inUnit.filter(
						(shortage) => mondayOf(shortage.day) === monday
					);
					const shortUnder = (underARule: boolean): number =>
						inWeek
							.filter(
								(shortage) =>
									(unstaffableRuleOf(shortage, unstaffable) !== undefined) ===
									underARule
							)
							.reduce((sum, shortage) => sum + shortage.shortBy, 0);
					return {
						id: monday,
						label: weekLabel(monday),
						values: {
							[SHORT_SERIES.tooFew]: shortUnder(true),
							[SHORT_SERIES.oneOff]: shortUnder(false),
						},
					};
				}),
			};
		})
		.sort(largestFirst);
};

/** The series ids of the overtime chart: the range's last month stands out from those before it. */
export const OVERTIME_SERIES = {
	latest: "latest",
	earlier: "earlier",
} as const;

const MINUTES_IN_AN_HOUR = 60;

/**
 * Overtime hours each month of the answer, one chart per unit, the last
 * month in its own series so it stands out. Whole hours: a chart is for
 * comparing, the table beneath has the exact figures.
 */
export const overtimeByMonthGroups = (
	departments: ReadonlyArray<OvertimeDepartment>,
	grouping: UnitGrouping,
	monthLabel: (month: string) => string
): Array<ColumnGroup> => {
	const months = [...new Set(departments.map((row) => row.month))].sort();
	const latest = months[months.length - 1];
	const units = new Set(departments.map((row) => unitOf(row, grouping)));
	return [...units]
		.map((unit): ColumnGroup => ({
			id: unit,
			title: unit,
			columns: months.map((month): ChartColumn => {
				const minutes = departments
					.filter(
						(row) => unitOf(row, grouping) === unit && row.month === month
					)
					.reduce((sum, row) => sum + row.overtimeMinutes, 0);
				return {
					id: month,
					label: monthLabel(month),
					values: {
						[month === latest
							? OVERTIME_SERIES.latest
							: OVERTIME_SERIES.earlier]: Math.round(
							minutes / MINUTES_IN_AN_HOUR
						),
					},
				};
			}),
		}))
		.sort(largestFirst);
};

/** Whether the overtime answer spans more than one month, so "earlier months" has something to show. */
export const spansSeveralMonths = (
	departments: ReadonlyArray<OvertimeDepartment>
): boolean => new Set(departments.map((row) => row.month)).size > 1;

/** The reasons a published roster changes, in the order drawn, each with its colour. */
const REASON_COLOURS: ReadonlyArray<[string, ChartColour]> = [
	["MANUAL", "inkBlue900"],
	["LEAVE_APPROVED", "inkBlue500"],
	["LEAVE_RECORDED", "inkBlue200"],
	["LEAVE_MOVE", "porcelain300"],
	["COVER_OPTION", "success600"],
];

/** The id and colour of every reason the app does not know by name. */
const OTHER_REASON = "OTHER";
const OTHER_COLOUR: ChartColour = "neutral400";

/**
 * The parts of a changes bar: every known reason in a fixed order, 0
 * included so bars and the legend line up, then anything else as "other"
 * when there is some.
 */
export const changeSegments = (
	reasons: ReadonlyArray<RosterChangeReasonCount>,
	reasonLabel: (reason: string) => string
): Array<BarSegment> => {
	const changesOf = (reason: string): number =>
		reasons
			.filter((each) => each.reason === reason)
			.reduce((sum, each) => sum + each.changes, 0);
	const known = new Set(REASON_COLOURS.map(([reason]) => reason));
	const other = reasons
		.filter((each) => !known.has(each.reason))
		.reduce((sum, each) => sum + each.changes, 0);
	return [
		...REASON_COLOURS.map(([reason, colour]): BarSegment => ({
			id: reason,
			label: reasonLabel(reason),
			colour,
			value: changesOf(reason),
		})),
		...(other > 0
			? [
					{
						id: OTHER_REASON,
						label: reasonLabel(OTHER_REASON),
						colour: OTHER_COLOUR,
						value: other,
					},
				]
			: []),
	];
};
