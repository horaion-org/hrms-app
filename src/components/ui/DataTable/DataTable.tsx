import {
	flexRender,
	getCoreRowModel,
	useReactTable,
	type ColumnDef,
} from "@tanstack/react-table";
import type { FunctionComponent } from "@/common/types";

/**
 * TanStack's ColumnDef is invariant in its value type, so a column list has to
 * be described with the same value type the table is built with.
 */
export type DataTableColumns<TRow> = Array<ColumnDef<TRow, unknown>>;

type DataTableProps<TRow> = {
	columns: DataTableColumns<TRow>;
	rows: Array<TRow>;
	/** Announced to assistive technology as the table's purpose. */
	caption: string;
	emptyMessage?: string;
};

export const DataTable = <TRow,>({
	columns,
	rows,
	caption,
	emptyMessage = "Nothing to show yet.",
}: DataTableProps<TRow>): FunctionComponent => {
	// React Compiler cannot memoize TanStack Table's returned functions, and
	// warns rather than silently producing stale UI. The table is rebuilt from
	// props on every render here, which is the behaviour we want.
	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
			<table className="min-w-full divide-y divide-slate-200 text-sm">
				<caption className="sr-only">{caption}</caption>
				<thead className="bg-slate-50">
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									className="px-4 py-3 text-left font-medium text-slate-600"
									scope="col"
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody className="divide-y divide-slate-100 bg-white">
					{rows.length === 0 ? (
						<tr>
							<td
								className="px-4 py-8 text-center text-slate-500"
								colSpan={columns.length}
							>
								{emptyMessage}
							</td>
						</tr>
					) : (
						table.getRowModel().rows.map((row) => (
							<tr key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-4 py-3 text-slate-900">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};
