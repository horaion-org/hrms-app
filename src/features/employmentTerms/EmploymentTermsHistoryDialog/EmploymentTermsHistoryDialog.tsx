import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import type { HistoryEntry } from "@/features/employmentTerms/api";
import { historyEntryColumns } from "@/features/employmentTerms/EmploymentTermsHistoryDialog/historyEntryColumns";

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
	const columns = useMemo(
		() =>
			historyEntryColumns(t, {
				language,
				canChange,
				onCorrect,
				onCancelChange,
			}),
		[t, language, canChange, onCorrect, onCancelChange]
	);
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
