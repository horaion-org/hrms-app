import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { DataTable } from "@/components/ui/DataTable";
import { importHistoryColumns } from "@/features/imports/ImportHistory/importHistoryColumns";
import type { ImportHistoryEntry } from "@/features/imports/importHistory";

export type ImportHistoryProps = {
	/** Imports of both kinds, newest first. */
	entries: Array<ImportHistoryEntry>;
	/** Whether one of the lists could not be loaded; the other is still shown. */
	failed?: boolean;
	onOpen: (entry: ImportHistoryEntry) => void;
	/** It sits under another section's h2 by default; use 2 directly under the page's h1. */
	headingLevel?: 2 | 3;
	className?: string;
};

/** The company's recent imports of both kinds the person may read: when, what, who, and how each ended. */
export const ImportHistory = ({
	entries,
	failed = false,
	onOpen,
	headingLevel = 3,
	className,
}: ImportHistoryProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const Heading = headingLevel === 2 ? "h2" : "h3";
	const columns = importHistoryColumns(t, {
		locale: formattingLocale(i18n),
		onOpen,
	});

	return (
		<section aria-labelledby="import-history-heading" className={className}>
			<Heading
				className="text-base font-semibold text-neutral-900"
				id="import-history-heading"
			>
				{t("settings.data.history.title")}
			</Heading>
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
