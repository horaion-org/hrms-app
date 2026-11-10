import type { TFunction } from "i18next";
import { formatDate } from "@/components/forms/Calendar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import type { HistoryEntry } from "@/features/employmentTerms/api";
import { formatHours } from "@/features/employmentTerms/hours";

const key = "employmentTerms.history";

export type HistoryEntryColumnsOptions = {
	/** The locale dates and hours are written in. */
	language: string;
	/** Adds Correct, and Cancel on a scheduled change. */
	canChange: boolean;
	onCorrect: (entry: HistoryEntry) => void;
	onCancelChange: (entry: HistoryEntry) => void;
};

/**
 * One person's employment terms history columns: from when (Scheduled when
 * it hasn't started), the terms and their own hours, who recorded it or how
 * Horaion made it, and Correct / Cancel when the reader may change terms.
 */
export const historyEntryColumns = (
	t: TFunction,
	{ language, canChange, onCorrect, onCancelChange }: HistoryEntryColumnsOptions
): Array<DataTableColumn<HistoryEntry>> => {
	const dateOf = (entry: HistoryEntry): string =>
		formatDate(entry.effectiveFrom, language);
	return [
		{
			id: "from",
			header: t(`${key}.from`),
			cell: (entry) => (
				<span className="flex flex-wrap items-center gap-2">
					{dateOf(entry)}
					{entry.scheduled && <Badge>{t(`${key}.scheduled`)}</Badge>}
				</span>
			),
		},
		{
			id: "terms",
			header: t(`${key}.terms`),
			cell: (entry) => (
				<>
					<span className="block font-semibold">{entry.termsName}</span>
					{entry.contractedWeekMinutes !== null && (
						<span className="block text-neutral-700">
							{t(`${key}.ownHours`, {
								week: formatHours(entry.contractedWeekMinutes, language),
							})}
						</span>
					)}
				</>
			),
		},
		{
			id: "by",
			header: t(`${key}.changedBy`),
			cell: (entry): string => {
				const at = entry.recordedAt
					? formatDate(entry.recordedAt, language)
					: "";
				if (entry.recordedBy)
					return t(`${key}.by`, {
						name:
							entry.recordedBy.displayName ??
							t("scheduling.detail.formerMember"),
						date: at,
					});
				// Entries Horaion made say how they came about.
				if (entry.source === "IMPORT")
					return t(`${key}.imported`, { date: at });
				if (entry.source === "HIRE") return t(`${key}.atHire`);
				if (entry.source === "BACKFILL") return t(`${key}.backfill`);
				if (entry.source === "TERMS_CHANGE")
					return t(`${key}.byTermsChange`, { date: at });
				return t(`${key}.bySystem`);
			},
		},
		...(canChange
			? [
					{
						id: "actions",
						header: t(`${key}.actions`),
						headerClassName: "w-30",
						cell: (entry: HistoryEntry) => (
							<div className="flex justify-center gap-2">
								<Button
									aria-label={t(`${key}.correct`, { date: dateOf(entry) })}
									variant="icon"
									onClick={() => {
										onCorrect(entry);
									}}
								>
									<EditIcon />
								</Button>
								{entry.scheduled && (
									<Button
										className="text-error-700"
										variant="icon"
										aria-label={t(`${key}.cancelChange`, {
											date: dateOf(entry),
										})}
										onClick={() => {
											onCancelChange(entry);
										}}
									>
										<DeleteIcon />
									</Button>
								)}
							</div>
						),
					},
				]
			: []),
	];
};
