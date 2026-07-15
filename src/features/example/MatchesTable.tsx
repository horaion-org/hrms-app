import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import type { FunctionComponent } from "@/common/types";
import type { Match } from "@/features/example/api";
import { TanStackTableDevelopmentTools } from "@/components/utils/development-tools/TanStackTableDevelopmentTools";
import { useExampleStore } from "@/store/useExampleStore";

const columnHelper = createColumnHelper<Match>();

const columns = [
	columnHelper.accessor("homeTeam", { header: "Home" }),
	columnHelper.accessor("awayTeam", { header: "Away" }),
	columnHelper.accessor(
		(row): string => `${row.homeScore} - ${row.awayScore}`,
		{
			id: "score",
			header: "Score",
		}
	),
];

interface MatchesTableProps {
	data: Array<Match>;
}

export const MatchesTable = ({
	data,
}: MatchesTableProps): FunctionComponent => {
	const selectedMatchId = useExampleStore((state) => state.selectedMatchId);
	const setSelectedMatchId = useExampleStore(
		(state) => state.setSelectedMatchId
	);

	// React Compiler cannot memoize TanStack Table's returned API; this is
	// expected and safe here (the table is used directly, not re-memoized).
	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full text-left text-sm">
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									className="border-b px-3 py-2 font-semibold"
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
				<tbody>
					{table.getRowModel().rows.map((row) => {
						const isSelected = row.original.id === selectedMatchId;
						return (
							<tr
								key={row.id}
								className={isSelected ? "bg-blue-100" : "hover:bg-gray-50"}
								onClick={(): void => {
									setSelectedMatchId(row.original.id);
								}}
							>
								{row.getVisibleCells().map((cell) => (
									<td
										key={cell.id}
										className="cursor-pointer border-b px-3 py-2"
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
			<TanStackTableDevelopmentTools table={table} />
		</div>
	);
};
