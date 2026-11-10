import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import {
	historyResultText,
	type ImportHistoryEntry,
} from "@/features/imports/importHistory";

export type ImportHistoryColumnsOptions = {
	/** The locale the time is written in. */
	locale: string;
	onOpen: (entry: ImportHistoryEntry) => void;
};

/** The import history's columns: when, which kind, who, how it ended, and Open. */
export const importHistoryColumns = (
	t: TFunction,
	{ locale, onOpen }: ImportHistoryColumnsOptions
): Array<DataTableColumn<ImportHistoryEntry>> => [
	{
		id: "when",
		header: t("settings.data.history.whenColumn"),
		cell: (entry) =>
			new Date(entry.importRecord.createdAt).toLocaleString(locale, {
				dateStyle: "medium",
				timeStyle: "short",
			}),
	},
	{
		id: "kind",
		header: t("settings.data.history.kindColumn"),
		cell: (entry) => t(`settings.data.history.kinds.${entry.kind}`),
	},
	{
		id: "by",
		header: t("settings.data.history.byColumn"),
		cell: (entry) => entry.importRecord.requestedBy,
	},
	{
		id: "result",
		header: t("settings.data.history.resultColumn"),
		cell: (entry) => historyResultText(entry, t),
	},
	{
		id: "open",
		header: t("settings.data.history.openColumn"),
		cell: (entry) => (
			<Button
				size="sm"
				variant="textlink"
				onClick={() => {
					onOpen(entry);
				}}
			>
				{t("settings.data.history.open")}
			</Button>
		),
		headerClassName: "w-24",
	},
];
