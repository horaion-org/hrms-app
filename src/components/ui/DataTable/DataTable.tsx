import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
	columnPinningFeature,
	createSortedRowModel,
	rowExpandingFeature,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric as sortAlphanumeric,
	tableFeatures,
	useTable,
	type ColumnDef,
	type ExpandedState,
	type RowSelectionState,
	type SortingState,
	type Updater,
} from "@tanstack/react-table";
import {
	Fragment,
	useId,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import {
	pinnedCellClasses,
	pinningStateOf,
	stickyStartClasses,
	type ColumnPin,
} from "@/components/ui/DataTable/columnPinning";
import { useScrollEdges } from "@/components/ui/DataTable/useScrollEdges";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ChevronRightIcon,
	SortIcon,
	TickIcon,
} from "@/components/ui/Icon";

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortAlphanumeric },
	rowSelectionFeature,
	columnPinningFeature,
	rowExpandingFeature,
});

/** One column: its header text, how a cell renders, and whether it sorts. */
export type DataTableColumn<TData extends object> = {
	id: string;
	/** Visible header text; also names the column's sort button. */
	header: string;
	cell: (row: TData) => ReactNode;
	/** The value the column sorts by; a column with one is sortable. */
	sortValue?: (row: TData) => string | number;
	/** Classes for the header cell, e.g. a fixed width such as `w-30`. */
	headerClassName?: string;
	/** Classes for each body cell, e.g. `font-semibold` or `text-center`. */
	cellClassName?: string;
	/**
	 * Leaves the column out below this breakpoint, so a phone keeps the
	 * columns that identify a row and act on it. The data stays one table.
	 */
	hideBelow?: ColumnBreakpoint;
	/**
	 * How the value reads on the naming column's summary line while the column
	 * is hidden by `hideBelow`; `cell` when left out. Return nothing to leave
	 * an unset value off the line.
	 */
	summary?: (row: TData) => ReactNode;
	/**
	 * Keeps the value off the summary line while the column is hidden. Only for
	 * a value every reader can open in one tap from the row: say where, beside it.
	 */
	omitFromSummary?: boolean;
	/**
	 * Keeps the column in view while the table scrolls sideways, from `md` up:
	 * `start` for the column naming each row, `end` for its actions. At most
	 * one column per side. Below `sm` the `start` column takes the room the
	 * other columns leave (at least 9rem), its content truncating.
	 */
	pin?: ColumnPin;
};

/** A breakpoint below which a column is left out. */
export type ColumnBreakpoint = "sm" | "md" | "lg" | "xl";

// Full class names keep them visible to Tailwind.
const hiddenBelowClasses: Record<ColumnBreakpoint, string> = {
	sm: "hidden sm:table-cell",
	md: "hidden md:table-cell",
	lg: "hidden lg:table-cell",
	xl: "hidden xl:table-cell",
};

/** Shown only below the breakpoint: while a column hidden there is out of the table. */
const shownBelowClasses: Record<ColumnBreakpoint, string> = {
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

const widerOf = (
	first: ColumnBreakpoint,
	second: ColumnBreakpoint
): ColumnBreakpoint =>
	BREAKPOINT_ORDER.indexOf(first) >= BREAKPOINT_ORDER.indexOf(second)
		? first
		: second;

/** A column `hideBelow` takes out of the table on smaller screens. */
type HidingColumn<TData extends object> = DataTableColumn<TData> & {
	hideBelow: ColumnBreakpoint;
};

const hides = <TData extends object>(
	column: DataTableColumn<TData>
): column is HidingColumn<TData> => column.hideBelow !== undefined;

/**
 * The column that names each row: the start-pinned one, else the first that
 * is never hidden. It carries the summary line and the hidden columns' sort.
 */
const namingColumnOf = <TData extends object>(
	columns: Array<DataTableColumn<TData>>
): DataTableColumn<TData> | undefined =>
	columns.find((column) => column.pin === "start") ??
	columns.find((column) => !hides(column));

/** The sorted column and its direction. */
export type DataTableSort = { id: string; desc: boolean };

export type DataTableProps<TData extends object> = {
	/** The table's accessible name. */
	label: string;
	columns: Array<DataTableColumn<TData>>;
	data: Array<TData>;
	/** A stable id per row; selection is kept by these ids. */
	getRowId: (row: TData) => string;
	/** The current sort when the caller owns it; otherwise the table keeps its own. */
	sort?: DataTableSort;
	/** The sort the table starts with when it keeps its own. */
	defaultSort?: DataTableSort;
	onSortChange?: (sort: DataTableSort) => void;
	/** `data` already arrives in `sort` order, e.g. sorted by the server. */
	manualSorting?: boolean;
	/** A sortable header's button toggles the direction, or opens a menu of both. */
	sortControl?: "toggle" | "menu";
	/** Adds a select-all box and one box per row, named by `rowLabel`. */
	selection?: {
		rowLabel: (row: TData) => string;
		/** The selected row ids when the caller owns them; otherwise the table keeps its own. */
		selectedIds?: Array<string>;
		onChange?: (selectedIds: Array<string>) => void;
		/**
		 * Rows whose box can change; every row when left out. A row that can't
		 * keeps its box as the selection says and shows it disabled, and
		 * select-all, ticking or clearing, passes it by. Select-all is disabled
		 * when no row's box can change.
		 */
		canSelect?: (row: TData) => boolean;
	};
	/**
	 * Adds a leading button per row, named by `rowLabel`, that shows
	 * `render(row)` in a full-width row beneath it. Several rows may be open;
	 * the content mounts only while its row is open.
	 */
	expansion?: {
		rowLabel: (row: TData) => string;
		render: (row: TData) => ReactNode;
		/** Rows that can open; every row when left out. */
		canExpand?: (row: TData) => boolean;
		/** The open row ids when the caller owns them; otherwise the table keeps its own. */
		expandedIds?: Array<string>;
		onChange?: (expandedIds: Array<string>) => void;
	};
	/** Shown across the table body when there are no rows. */
	emptyState?: ReactNode;
	className?: string;
};

const resolve = <T,>(updater: Updater<T>, current: T): T =>
	typeof updater === "function"
		? (updater as (previous: T) => T)(current)
		: updater;

const headerCellClasses =
	"h-11 border-l border-neutral-400 bg-neutral-200 px-3 text-left text-sm font-bold text-neutral-900 first:border-l-0";

// Row borders sit on the cells: the table keeps separate borders so pinned
// (sticky) cells carry their own lines while the rest scrolls beneath them.
const bodyCellClasses =
	"h-16 border-t border-l border-neutral-400 bg-white px-3 py-2 text-xs break-words text-neutral-900 first:border-l-0";

/*
 * On a phone the column naming each row (the start pin) takes the room the
 * other columns leave instead of its content's width, so a long name
 * truncates and the actions stay on screen. It keeps 9rem, what a checkbox
 * and two actions leave on a 360 px phone, so a table still showing many
 * columns scrolls in its frame rather than losing the name.
 */
const namingColumnPhoneClasses = "max-sm:w-full max-sm:max-w-0 max-sm:min-w-36";

// The leading cells (row expander, row checkbox) are each 3rem wide.
const selectionCellClasses = "w-12 px-0";

const ariaSort = (
	direction: false | "asc" | "desc"
): "ascending" | "descending" | "none" => {
	if (direction === "asc") return "ascending";
	if (direction === "desc") return "descending";
	return "none";
};

const SortDirectionIcon = ({
	direction,
}: {
	direction: false | "asc" | "desc";
}): FunctionComponent => {
	if (direction === "asc") return <ArrowUpIcon className="text-ink-blue-900" />;
	if (direction === "desc")
		return <ArrowDownIcon className="text-ink-blue-900" />;
	return <SortIcon className="text-neutral-700" />;
};

const sortMenuItemClasses =
	"flex h-11 w-full cursor-pointer items-center justify-between gap-3 bg-white px-4 text-left text-sm font-normal text-neutral-900 outline-none data-focus:bg-neutral-100";

/** One choice in a sort menu: a column and a direction. */
type SortOption = {
	columnId: string;
	desc: boolean;
	label: string;
	applied: boolean;
};

const SortMenu = ({
	label,
	options,
	onSort,
}: {
	label: string;
	options: Array<SortOption>;
	onSort: (option: SortOption) => void;
}): FunctionComponent => {
	const applied = options.find((option) => option.applied);
	const direction = applied ? (applied.desc ? "desc" : "asc") : false;
	return (
		<Menu as="div" className="-my-2 -mr-2 inline-flex">
			<MenuButton aria-label={label} as={Button} variant="icon">
				<SortDirectionIcon direction={direction} />
			</MenuButton>
			<MenuItems
				anchor="bottom end"
				className="z-10 w-max min-w-40 divide-y divide-neutral-400 overflow-hidden rounded-lg border border-neutral-400 bg-white shadow-md outline-none [--anchor-gap:4px]"
			>
				{options.map((option) => (
					// Headless UI fixes the role to `menuitem`, so the applied
					// choice is `aria-current` rather than `aria-checked`.
					<MenuItem
						key={option.label}
						aria-current={option.applied ? "true" : undefined}
						as="button"
						className={sortMenuItemClasses}
						type="button"
						onClick={() => {
							onSort(option);
						}}
					>
						<span>{option.label}</span>
						<span className="size-5 shrink-0">
							{option.applied && (
								<TickIcon className="size-5 text-ink-blue-900" />
							)}
						</span>
					</MenuItem>
				))}
			</MenuItems>
		</Menu>
	);
};

/**
 * Under the naming cell's own content, the values of the columns hidden at
 * this width, each showing exactly while its column is out of the table and
 * named by its header for screen readers. Every value leads with a dot; the
 * line sits one dot's width to the left inside a clipping box, so the dot
 * that starts each wrapped line is cut off and no line starts or ends with one.
 */
const SummaryLine = <TData extends object>({
	row,
	columns,
}: {
	row: TData;
	columns: Array<HidingColumn<TData>>;
}): FunctionComponent => {
	const items = columns
		.map((column) => ({ column, value: (column.summary ?? column.cell)(row) }))
		.filter(
			({ value }) => value !== null && value !== undefined && value !== ""
		);
	if (items.length === 0) return null;
	return (
		<div
			className={joinClassNames(
				"mt-1 overflow-hidden font-normal text-neutral-800",
				shownBelowClasses[
					items.map(({ column }) => column.hideBelow).reduce(widerOf)
				]
			)}
		>
			<div className="-ml-3 flex flex-wrap items-center gap-y-1">
				{items.map(({ column, value }) => (
					<span
						key={column.id}
						className={joinClassNames(
							"inline-flex min-w-0 items-center",
							shownBelowClasses[column.hideBelow]
						)}
					>
						<span aria-hidden="true" className="w-3 shrink-0 text-center">
							·
						</span>
						<span className="sr-only">{column.header}: </span>
						{value}
					</span>
				))}
			</div>
		</div>
	);
};

/** The sort menu shown while some sortable columns are hidden: where it shows and what it offers. */
type HiddenSortBand<TData extends object> = {
	shownClasses: string;
	columns: Array<DataTableColumn<TData>>;
};

/**
 * One band per breakpoint below which a sortable column hides: in each, the
 * naming column's menu offers itself and every sortable column hidden there,
 * so no menu ever holds a choice for a column on screen. `regularFrom` is
 * where the naming column's own control takes over.
 */
const hiddenSortBandsOf = <TData extends object>(
	columns: Array<DataTableColumn<TData>>,
	naming: DataTableColumn<TData>
): { bands: Array<HiddenSortBand<TData>>; regularFrom?: string } => {
	const hidden = columns.filter(
		(column): column is HidingColumn<TData> =>
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

/** Shows a control only from a breakpoint; bare where it shows everywhere, so its layout stays as it was. */
const ShownFrom = ({
	classes,
	children,
}: {
	classes: string | undefined;
	children: ReactNode;
}): FunctionComponent =>
	classes ? <span className={classes}>{children}</span> : <>{children}</>;

// TanStack may set every row open at once as `true`; keep the per-row record.
const expandedRecordOf = (
	state: ExpandedState,
	rowIds: Array<string>
): Record<string, boolean> =>
	state === true
		? Object.fromEntries(rowIds.map((rowId) => [rowId, true]))
		: state;

/** The leading button that opens and closes a row's details. */
const RowExpander = ({
	label,
	open,
	detailsId,
	onToggle,
}: {
	label: string;
	open: boolean;
	detailsId: string;
	onToggle: () => void;
}): FunctionComponent => (
	<Button
		aria-controls={open ? detailsId : undefined}
		aria-expanded={open}
		aria-label={label}
		className="mx-auto flex items-center justify-center"
		variant="icon"
		onClick={onToggle}
	>
		<ChevronRightIcon
			className={joinClassNames(
				"motion-safe:transition-transform",
				open && "rotate-90"
			)}
		/>
	</Button>
);

export const DataTable = <TData extends object>({
	label,
	columns,
	data,
	getRowId,
	sort,
	defaultSort,
	onSortChange,
	manualSorting = false,
	sortControl = "toggle",
	selection,
	expansion,
	emptyState,
	className,
}: DataTableProps<TData>): FunctionComponent => {
	const { t } = useTranslation();
	const [ownSorting, setOwnSorting] = useState<SortingState>(
		defaultSort ? [defaultSort] : []
	);
	const sorting = sort ? [sort] : ownSorting;
	const [ownRowSelection, setOwnRowSelection] = useState<RowSelectionState>({});
	const selectedIds = selection?.selectedIds;
	const rowSelection = useMemo(
		(): RowSelectionState =>
			selectedIds
				? Object.fromEntries(selectedIds.map((rowId) => [rowId, true]))
				: ownRowSelection,
		[selectedIds, ownRowSelection]
	);
	const [ownExpanded, setOwnExpanded] = useState<Record<string, boolean>>({});
	const expandedIds = expansion?.expandedIds;
	const expanded = useMemo(
		(): Record<string, boolean> =>
			expandedIds
				? Object.fromEntries(expandedIds.map((rowId) => [rowId, true]))
				: ownExpanded,
		[expandedIds, ownExpanded]
	);
	const detailsIdPrefix = useId();

	const columnsById = useMemo(
		() => new Map(columns.map((column) => [column.id, column])),
		[columns]
	);
	const naming = namingColumnOf(columns);
	const summaryColumns = columns.filter(
		(column): column is HidingColumn<TData> =>
			hides(column) && !column.omitFromSummary && column !== naming
	);
	const hiddenSort = naming
		? hiddenSortBandsOf(columns, naming)
		: { bands: [], regularFrom: undefined };
	const columnDefs = useMemo(
		(): Array<ColumnDef<typeof features, TData>> =>
			columns.map((column) => ({
				id: column.id,
				header: column.header,
				accessorFn: (row: TData): string | number =>
					column.sortValue?.(row) ?? "",
				enableSorting: column.sortValue !== undefined,
				sortFn: "alphanumeric",
			})),
		[columns]
	);
	const columnPinning = useMemo(() => pinningStateOf(columns), [columns]);
	const pinned = columnPinning.start.length + columnPinning.end.length > 0;
	// Leading cells stick along with a start-pinned column, so it never slides under them.
	const leadingClasses = (index: number): string | undefined =>
		columnPinning.start.length > 0 ? stickyStartClasses(index) : undefined;
	// Leading cells come in a fixed order: the row expander, then the row checkbox.
	const selectionIndex = expansion ? 1 : 0;
	const leadingCount = selectionIndex + (selection ? 1 : 0);
	const frameRef = useRef<HTMLDivElement>(null);
	const edges = useScrollEdges(frameRef, pinned);

	const table = useTable({
		features,
		columns: columnDefs,
		data,
		getRowId,
		manualSorting,
		enableSortingRemoval: false,
		enableMultiSort: false,
		sortDescFirst: false,
		enableRowSelection: selection?.canSelect
			? (row): boolean => selection.canSelect?.(row.original) ?? true
			: selection !== undefined,
		enableExpanding: expansion !== undefined,
		getRowCanExpand: (row) =>
			expansion?.canExpand?.(row.original) ?? expansion !== undefined,
		// Open rows stay open when the data refetches or re-sorts.
		autoResetExpanded: false,
		state: { sorting, rowSelection, columnPinning, expanded },
		onSortingChange: (updater) => {
			const next = resolve(updater, sorting);
			if (!sort) setOwnSorting(next);
			const [first] = next;
			if (first) onSortChange?.(first);
		},
		onRowSelectionChange: (updater) => {
			const next = resolve(updater, rowSelection);
			if (!selectedIds) setOwnRowSelection(next);
			selection?.onChange?.(Object.keys(next).filter((rowId) => next[rowId]));
		},
		onExpandedChange: (updater) => {
			const next = expandedRecordOf(
				resolve<ExpandedState>(updater, expanded),
				table.getRowModel().rows.map((row) => row.id)
			);
			if (!expandedIds) setOwnExpanded(next);
			expansion?.onChange?.(Object.keys(next).filter((rowId) => next[rowId]));
		},
	});

	/** A column's two sort choices, named by the column too in a menu that holds others. */
	const sortOptionsOf = (
		column: DataTableColumn<TData> | undefined,
		named = false
	): Array<SortOption> => {
		if (!column) return [];
		const sorted = table.getColumn(column.id)?.getIsSorted();
		return [false, true].map((desc) => {
			const direction = t(
				desc ? "dataTable.sortDescending" : "dataTable.sortAscending"
			);
			return {
				columnId: column.id,
				desc,
				applied: sorted === (desc ? "desc" : "asc"),
				label: named
					? t("dataTable.sortColumn", { column: column.header, direction })
					: direction,
			};
		});
	};
	const sortBy = (option: SortOption): void => {
		table.getColumn(option.columnId)?.toggleSorting(option.desc);
	};

	const rows = table.getRowModel().rows;
	const headers = table.getHeaderGroups()[0]?.headers ?? [];
	const columnCount = headers.length + leadingCount;
	const allSelected = rows.length > 0 && table.getIsAllRowsSelected();
	// Select-all does nothing when no row's box can change.
	const noneSelectable = !rows.some((row) => row.getCanSelect());

	return (
		<div
			ref={frameRef}
			data-overflows-end={edges.overflowsEnd || undefined}
			data-overflows-start={edges.overflowsStart || undefined}
			className={joinClassNames(
				// Relative, so positioned content in a cell (a visually hidden label) scrolls with the
				// table instead of widening the page.
				"relative overflow-x-auto rounded-lg border border-neutral-400",
				pinned && "group",
				// Open details measure the frame (100cqw) to stay in view while it scrolls.
				expansion && "@container",
				className
			)}
		>
			<table
				aria-label={label}
				// Fixed widths from `xl`; below it the browser sizes columns to their content, so a
				// column without a width never collapses to nothing and the frame scrolls instead.
				// The 576 px floor starts at `sm`: a phone's priority columns fit its screen.
				className="w-full table-auto border-separate border-spacing-0 sm:min-w-xl xl:table-fixed"
			>
				<thead>
					<tr>
						{expansion && (
							<th
								scope="col"
								className={joinClassNames(
									headerCellClasses,
									selectionCellClasses,
									leadingClasses(0)
								)}
							>
								<span className="sr-only">{t("dataTable.details")}</span>
							</th>
						)}
						{selection && (
							<th
								scope="col"
								className={joinClassNames(
									headerCellClasses,
									selectionCellClasses,
									leadingClasses(selectionIndex)
								)}
							>
								<Checkbox
									hideLabel
									checked={allSelected}
									className="justify-center"
									disabled={noneSelectable}
									indeterminate={!allSelected && table.getIsSomeRowsSelected()}
									label={t("dataTable.selectAll")}
									onChange={table.getToggleAllRowsSelectedHandler()}
								/>
							</th>
						)}
						{headers.map((header) => {
							const column = columnsById.get(header.column.id);
							const sortable = header.column.getCanSort();
							const direction = header.column.getIsSorted();
							return (
								<th
									key={header.id}
									aria-sort={sortable ? ariaSort(direction) : undefined}
									scope="col"
									className={joinClassNames(
										headerCellClasses,
										column?.hideBelow && hiddenBelowClasses[column.hideBelow],
										column?.headerClassName,
										column?.pin === "start" && namingColumnPhoneClasses,
										pinnedCellClasses(header.column.getIsPinned(), leadingCount)
									)}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="min-w-0 truncate">{column?.header}</span>
										{column === naming &&
											hiddenSort.bands.map((band) => (
												<span
													key={band.shownClasses}
													className={band.shownClasses}
												>
													<SortMenu
														label={t("dataTable.sortRows")}
														options={band.columns.flatMap((shown) =>
															sortOptionsOf(shown, true)
														)}
														onSort={sortBy}
													/>
												</span>
											))}
										{sortable && (
											<ShownFrom
												classes={
													column === naming ? hiddenSort.regularFrom : undefined
												}
											>
												{sortControl === "menu" ? (
													<SortMenu
														options={sortOptionsOf(column)}
														label={t("dataTable.sortBy", {
															column: column?.header,
														})}
														onSort={sortBy}
													/>
												) : (
													<Button
														className="-my-2 -mr-2"
														variant="icon"
														aria-label={t("dataTable.sortBy", {
															column: column?.header,
														})}
														onClick={header.column.getToggleSortingHandler()}
													>
														<SortDirectionIcon direction={direction} />
													</Button>
												)}
											</ShownFrom>
										)}
									</div>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 && (
						<tr>
							<td
								className="h-16 border-t border-neutral-400 bg-white px-3 text-center text-sm text-neutral-700"
								colSpan={columnCount}
							>
								{emptyState}
							</td>
						</tr>
					)}
					{rows.map((row) => {
						const open = row.getIsExpanded();
						const detailsId = `${detailsIdPrefix}-details-${row.id}`;
						return (
							<Fragment key={row.id}>
								<tr
									className="hover:[&>td]:bg-neutral-50 data-expanded:[&>td]:bg-neutral-50"
									data-expanded={open || undefined}
								>
									{expansion && (
										<td
											className={joinClassNames(
												bodyCellClasses,
												selectionCellClasses,
												leadingClasses(0)
											)}
										>
											{row.getCanExpand() && (
												<RowExpander
													detailsId={detailsId}
													open={open}
													label={t("dataTable.showDetails", {
														name: expansion.rowLabel(row.original),
													})}
													onToggle={row.getToggleExpandedHandler()}
												/>
											)}
										</td>
									)}
									{selection && (
										<td
											className={joinClassNames(
												bodyCellClasses,
												selectionCellClasses,
												leadingClasses(selectionIndex)
											)}
										>
											<Checkbox
												hideLabel
												checked={row.getIsSelected()}
												className="justify-center"
												disabled={!row.getCanSelect()}
												label={t("dataTable.selectRow", {
													name: selection.rowLabel(row.original),
												})}
												onChange={row.getToggleSelectedHandler()}
											/>
										</td>
									)}
									{[
										...row.getStartVisibleCells(),
										...row.getCenterVisibleCells(),
										...row.getEndVisibleCells(),
									].map((cell) => {
										const column = columnsById.get(cell.column.id);
										return (
											<td
												key={cell.id}
												className={joinClassNames(
													bodyCellClasses,
													column?.hideBelow &&
														hiddenBelowClasses[column.hideBelow],
													column?.cellClassName,
													column?.pin === "start" && namingColumnPhoneClasses,
													pinnedCellClasses(
														cell.column.getIsPinned(),
														leadingCount
													)
												)}
											>
												{column?.cell(row.original)}
												{column === naming && summaryColumns.length > 0 && (
													<SummaryLine
														columns={summaryColumns}
														row={row.original}
													/>
												)}
											</td>
										);
									})}
								</tr>
								{open && expansion && (
									<tr id={detailsId}>
										<td
											className="bg-neutral-50 p-0 text-sm text-neutral-900"
											colSpan={columnCount}
										>
											<div className="px-3 py-4 md:sticky md:start-0 md:w-[100cqw]">
												{expansion.render(row.original)}
											</div>
										</td>
									</tr>
								)}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
