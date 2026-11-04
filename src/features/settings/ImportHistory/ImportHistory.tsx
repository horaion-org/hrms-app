import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
	historyResultText,
	type ImportHistoryEntry,
} from "@/features/settings/importHistory";

export type ImportHistoryProps = {
	/** Imports of both kinds, newest first. */
	entries: Array<ImportHistoryEntry>;
	/** Whether one of the lists could not be loaded; the other is still shown. */
	failed?: boolean;
	onOpen: (entry: ImportHistoryEntry) => void;
	className?: string;
};

/** The company's recent imports of both kinds the person may read: when, what, who, and how each ended. */
export const ImportHistory = ({
	entries,
	failed = false,
	onOpen,
	className,
}: ImportHistoryProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const columns: Array<DataTableColumn<ImportHistoryEntry>> = [
		{
			id: "when",
			header: t("settings.data.history.whenColumn"),
			cell: (entry) =>
				new Date(entry.importRecord.createdAt).toLocaleString(i18n.language, {
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

	return (
		<section aria-labelledby="import-history-heading" className={className}>
			<h3
				className="text-base font-semibold text-neutral-900"
				id="import-history-heading"
			>
				{t("settings.data.history.title")}
			</h3>
			{failed && (
				<p className="mt-2 text-sm text-error-700" role="alert">
					{t("settings.data.history.failed")}
				</p>
			)}
			<DataTable
				className="mt-4"
				columns={columns}
				data={entries}
				emptyState={t("settings.data.history.empty")}
				getRowId={(entry) => `${entry.kind}:${entry.importRecord.importId}`}
				label={t("settings.data.history.title")}
			/>
		</section>
	);
};
