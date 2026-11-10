/*
 * DataTable's responsive column rules, without React: which column names
 * each row, which hidden columns its summary line carries, and which sort
 * menu the naming column shows at each width.
 */
import type { ColumnPin } from "@/components/ui/DataTable/columnPinning";

/** A breakpoint below which a column is left out. */
export type ColumnBreakpoint = "sm" | "md" | "lg" | "xl";

/** What the rules read of a column. */
type ResponsiveColumn = {
	hideBelow?: ColumnBreakpoint;
	sortValue?: unknown;
	omitFromSummary?: boolean;
	pin?: ColumnPin;
};

/** A column `hideBelow` takes out of the table on smaller screens. */
export type HidingColumn<Column extends ResponsiveColumn> = Column & {
	hideBelow: ColumnBreakpoint;
};

// Full class names keep them visible to Tailwind.
export const hiddenBelowClasses: Record<ColumnBreakpoint, string> = {
	sm: "hidden sm:table-cell",
	md: "hidden md:table-cell",
	lg: "hidden lg:table-cell",
	xl: "hidden xl:table-cell",
};

/** Shown only below the breakpoint: while a column hidden there is out of the table. */
export const shownBelowClasses: Record<ColumnBreakpoint, string> = {
	sm: "sm:hidden",
	md: "md:hidden",
	lg: "lg:hidden",
	xl: "xl:hidden",
};

/** Shown from `from` up to (not including) `below`; `from` left out means from the smallest screen. */
const shownBetweenClasses: Record<string, string> = {
	"-sm": "inline-flex sm:hidden",
	"-md": "inline-flex md:hidden",
	"-lg": "inline-flex lg:hidden",
	"-xl": "inline-flex xl:hidden",
	"sm-md": "hidden sm:inline-flex md:hidden",
	"sm-lg": "hidden sm:inline-flex lg:hidden",
	"sm-xl": "hidden sm:inline-flex xl:hidden",
	"md-lg": "hidden md:inline-flex lg:hidden",
	"md-xl": "hidden md:inline-flex xl:hidden",
	"lg-xl": "hidden lg:inline-flex xl:hidden",
	"sm-": "hidden sm:inline-flex",
	"md-": "hidden md:inline-flex",
	"lg-": "hidden lg:inline-flex",
	"xl-": "hidden xl:inline-flex",
};

const BREAKPOINT_ORDER: Array<ColumnBreakpoint> = ["sm", "md", "lg", "xl"];

/** The wider of two breakpoints. */
export const widerOf = (
	first: ColumnBreakpoint,
	second: ColumnBreakpoint
): ColumnBreakpoint =>
	BREAKPOINT_ORDER.indexOf(first) >= BREAKPOINT_ORDER.indexOf(second)
		? first
		: second;

/** Whether `hideBelow` takes the column out on smaller screens. */
const hides = <Column extends ResponsiveColumn>(
	column: Column
): column is HidingColumn<Column> => column.hideBelow !== undefined;

/**
 * The column that names each row: the start-pinned one, else the first that
 * is never hidden. It carries the summary line and the hidden columns' sort.
 */
export const namingColumnOf = <Column extends ResponsiveColumn>(
	columns: Array<Column>
): Column | undefined =>
	columns.find((column) => column.pin === "start") ??
	columns.find((column) => !hides(column));

/** The columns whose values the naming column's summary line shows while they are hidden. */
export const summaryColumnsOf = <Column extends ResponsiveColumn>(
	columns: Array<Column>,
	naming: Column | undefined
): Array<HidingColumn<Column>> =>
	columns.filter(
		(column): column is HidingColumn<Column> =>
			hides(column) && !column.omitFromSummary && column !== naming
	);

/** The sort menu shown while some sortable columns are hidden: where it shows and what it offers. */
export type HiddenSortBand<Column> = {
	shownClasses: string;
	columns: Array<Column>;
};

/**
 * One band per breakpoint below which a sortable column hides: in each, the
 * naming column's menu offers itself and every sortable column hidden there,
 * so no menu ever holds a choice for a column on screen. `regularFrom` is
 * where the naming column's own control takes over.
 */
export const hiddenSortBandsOf = <Column extends ResponsiveColumn>(
	columns: Array<Column>,
	naming: Column
): { bands: Array<HiddenSortBand<Column>>; regularFrom?: string } => {
	const hidden = columns.filter(
		(column): column is HidingColumn<Column> =>
			hides(column) && column.sortValue !== undefined && column !== naming
	);
	const breakpoints = BREAKPOINT_ORDER.filter((breakpoint) =>
		hidden.some((column) => column.hideBelow === breakpoint)
	);
	const own = naming.sortValue === undefined ? [] : [naming];
	const bands = breakpoints.map((below, index) => ({
		shownClasses:
			shownBetweenClasses[`${breakpoints[index - 1] ?? ""}-${below}`] ?? "",
		columns: [
			...own,
			...hidden.filter(
				(column) => widerOf(column.hideBelow, below) === column.hideBelow
			),
		],
	}));
	const widest = breakpoints[breakpoints.length - 1];
	return {
		bands,
		regularFrom: widest ? shownBetweenClasses[`${widest}-`] : undefined,
	};
};
