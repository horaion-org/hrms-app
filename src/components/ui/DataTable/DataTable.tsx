import {
	createSortedRowModel,
	rowSelectionFeature,
	rowSortingFeature,
	sortFn_alphanumeric as sortAlphanumeric,
	tableFeatures,
	useTable,
	type ColumnDef,
	type RowSelectionState,
	type SortingState,
	type Updater,
} from "@tanstack/react-table";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ArrowDownIcon, ArrowUpIcon, SortIcon } from "@/components/ui/Icon";

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: { alphanumeric: sortAlphanumeric },
	rowSelectionFeature,
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
};

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
	/** Adds a select-all box and one box per row, named by `rowLabel`. */
	selection?: {
		rowLabel: (row: TData) => string;
		onChange?: (selectedIds: Array<string>) => void;
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

const bodyCellClasses =
	"h-16 border-l border-neutral-400 bg-white px-3 py-2 text-xs break-words text-neutral-900 first:border-l-0";

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

export const DataTable = <TData extends object>({
	label,
	columns,
	data,
	getRowId,
	sort,
	defaultSort,
	onSortChange,
	manualSorting = false,
	selection,
	emptyState,
	className,
}: DataTableProps<TData>): FunctionComponent => {
	const { t } = useTranslation();
	const [ownSorting, setOwnSorting] = useState<SortingState>(
		defaultSort ? [defaultSort] : []
	);
	const sorting = sort ? [sort] : ownSorting;
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const columnsById = useMemo(
		() => new Map(columns.map((column) => [column.id, column])),
		[columns]
	);
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

	const table = useTable({
		features,
		columns: columnDefs,
		data,
		getRowId,
		manualSorting,
		enableSortingRemoval: false,
		enableMultiSort: false,
		sortDescFirst: false,
		enableRowSelection: selection !== undefined,
		state: { sorting, rowSelection },
		onSortingChange: (updater) => {
			const next = resolve(updater, sorting);
			if (!sort) setOwnSorting(next);
			const [first] = next;
			if (first) onSortChange?.(first);
		},
		onRowSelectionChange: (updater) => {
			const next = resolve(updater, rowSelection);
			setRowSelection(next);
			selection?.onChange?.(Object.keys(next).filter((rowId) => next[rowId]));
		},
	});

	const rows = table.getRowModel().rows;
	const headers = table.getHeaderGroups()[0]?.headers ?? [];
	const columnCount = headers.length + (selection ? 1 : 0);
	const allSelected = rows.length > 0 && table.getIsAllRowsSelected();

	return (
		<div
			className={joinClassNames(
				"overflow-x-auto rounded-lg border border-neutral-400",
				className
			)}
		>
			<table
				aria-label={label}
				className="w-full min-w-xl table-fixed border-collapse"
			>
				<thead>
					<tr>
						{selection && (
							<th
								scope="col"
								className={joinClassNames(
									headerCellClasses,
									selectionCellClasses
								)}
							>
								<Checkbox
									hideLabel
									checked={allSelected}
									className="justify-center"
									disabled={rows.length === 0}
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
										column?.headerClassName
									)}
								>
									<div className="flex items-center justify-between gap-2">
										<span className="min-w-0 truncate">{column?.header}</span>
										{sortable && (
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
									</div>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 && (
						<tr className="border-t border-neutral-400">
							<td
								className="h-16 bg-white px-3 text-center text-sm text-neutral-700"
								colSpan={columnCount}
							>
								{emptyState}
							</td>
						</tr>
					)}
					{rows.map((row) => (
						<tr
							key={row.id}
							className="border-t border-neutral-400 hover:[&>td]:bg-neutral-50"
						>
							{selection && (
								<td
									className={joinClassNames(
										bodyCellClasses,
										selectionCellClasses
									)}
								>
									<Checkbox
										hideLabel
										checked={row.getIsSelected()}
										className="justify-center"
										label={t("dataTable.selectRow", {
											name: selection.rowLabel(row.original),
										})}
										onChange={row.getToggleSelectedHandler()}
									/>
								</td>
							)}
							{row.getAllCells().map((cell) => {
								const column = columnsById.get(cell.column.id);
								return (
									<td
										key={cell.id}
										className={joinClassNames(
											bodyCellClasses,
											column?.cellClassName
										)}
									>
										{column?.cell(row.original)}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
