import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { DataTableColumn } from "@/components/ui/DataTable/DataTable";
import {
	shownBelowClasses,
	widerOf,
	type HidingColumn,
} from "@/components/ui/DataTable/responsiveColumns";

/**
 * Under the naming cell's own content, the values of the columns hidden at
 * this width, each showing exactly while its column is out of the table and
 * named by its header for screen readers. Every value leads with a dot; the
 * line sits one dot's width to the left inside a clipping box, so the dot
 * that starts each wrapped line is cut off and no line starts or ends with one.
 */
export const SummaryLine = <TData extends object>({
	row,
	columns,
}: {
	row: TData;
	columns: Array<HidingColumn<DataTableColumn<TData>>>;
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
