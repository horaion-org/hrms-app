import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { formatDate } from "@/components/forms/Calendar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteIcon, EditIcon } from "@/components/ui/Icon";
import type { HistoryEntry } from "@/features/employmentTerms/api";
import { formatHours } from "@/features/employmentTerms/hours";

export type EmploymentTermsHistoryDialogProps = {
	displayName: string;
	/** Newest first, as the API sends it. */
	history: ReadonlyArray<HistoryEntry>;
	/** With `member_employment_terms:update` where the person is. */
	canChange: boolean;
	onCorrect: (entry: HistoryEntry) => void;
	onCancelChange: (entry: HistoryEntry) => void;
	onClose: () => void;
};

const key = "employmentTerms.history";

/**
 * Every entry of one person's employment terms, newest first: from when,
 * which terms (and their own hours), and who recorded it. A change that
 * hasn't started is marked Scheduled and can be cancelled; any entry can be
 * corrected. Changes themselves are made from the profile row.
 */
export const EmploymentTermsHistoryDialog = ({
	displayName,
	history,
	canChange,
	onCorrect,
	onCancelChange,
	onClose,
}: EmploymentTermsHistoryDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const columns = useMemo((): Array<DataTableColumn<HistoryEntry>> => {
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
	}, [t, language, canChange, onCorrect, onCancelChange]);
	return (
		<Dialog
			open
			className="max-w-200"
			description={t(`${key}.description`, { name: displayName })}
			title={t(`${key}.title`)}
			footer={
				<div className="flex justify-end">
					<Button variant="cancel" onClick={onClose}>
						{t(`${key}.close`)}
					</Button>
				</div>
			}
			onClose={onClose}
		>
			<DataTable
				columns={columns}
				data={[...history]}
				emptyState={t(`${key}.empty`)}
				getRowId={(entry) => entry.id}
				label={t(`${key}.label`)}
			/>
		</Dialog>
	);
};
