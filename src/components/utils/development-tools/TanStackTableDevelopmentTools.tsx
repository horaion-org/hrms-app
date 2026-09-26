import type { RowData, Table, TableFeatures } from "@tanstack/react-table";
import { useTanStackTableDevtools } from "@tanstack/react-table-devtools";
import type { FunctionComponent } from "@/common/types";

type TanStackTableDevelopmentToolsProps<
	TFeatures extends TableFeatures,
	TData extends RowData,
> = { table: Table<TFeatures, TData> };

// Registers a table with the unified TanStack Devtools shell, whose "TanStack
// Table" panel then shows it. The devtools package swaps in no-ops outside
// development, so nothing ships to production.
export const TanStackTableDevelopmentTools = <
	TFeatures extends TableFeatures,
	TData extends RowData,
>({
	table,
}: TanStackTableDevelopmentToolsProps<TFeatures, TData>): FunctionComponent => {
	useTanStackTableDevtools(table);
	return null;
};
