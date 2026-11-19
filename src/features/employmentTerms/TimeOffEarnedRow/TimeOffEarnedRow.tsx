import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { formatDate } from "@/components/forms/Calendar";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { durationShort } from "@/features/employmentTerms/hours";
import type {
	TimeOffBalance,
	TimeOffEntry,
} from "@/features/employmentTerms/timeOffBalance";

export type TimeOffEarnedRowProps = {
	balance: TimeOffBalance;
	/** Whose balance it is, named in the History dialog. */
	displayName: string;
};

const key = "employmentTerms.timeOff";

/** An entry's minutes with their sign, e.g. "+4 h" or "−4 h". */
const signedDuration = (
	minutes: number,
	t: Parameters<typeof durationShort>[1]
): string =>
	t(minutes < 0 ? `${key}.taken` : `${key}.earned`, {
		time: durationShort(Math.abs(minutes), t),
	});

/**
 * The Employment card's "Time off earned" value: the hours a person has left
 * to take as Off in lieu, and History, which lists every week that earned
 * time off and every Off in lieu that drew on it, oldest first. Read-only:
 * the balance follows published rosters and approved leave.
 */
export const TimeOffEarnedRow = ({
	balance,
	displayName,
}: TimeOffEarnedRowProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const [historyOpen, setHistoryOpen] = useState(false);
	const columns: Array<DataTableColumn<TimeOffEntry & { id: string }>> = [
		{
			id: "when",
			header: t(`${key}.whenColumn`),
			cell: (entry) =>
				entry.weekStart
					? t(`${key}.weekOf`, { date: formatDate(entry.weekStart, language) })
					: entry.date
						? formatDate(entry.date, language)
						: "",
		},
		{
			id: "what",
			header: t(`${key}.whatColumn`),
			cell: (entry) =>
				t(entry.kind === "TAKEN" ? `${key}.takenAs` : `${key}.earnedBy`),
		},
		{
			id: "time",
			header: t(`${key}.timeColumn`),
			cell: (entry) => signedDuration(entry.minutes, t),
		},
	];
	return (
		<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
			<span>{durationShort(balance.balanceMinutes, t)}</span>
			{balance.entries.length > 0 && (
				<Button
					variant="textlink"
					onClick={() => {
						setHistoryOpen(true);
					}}
				>
					{t(`${key}.history`)}
				</Button>
			)}
			{historyOpen && (
				<Dialog
					open
					className="max-w-200"
					description={t(`${key}.historyDescription`, { name: displayName })}
					title={t(`${key}.historyTitle`)}
					footer={
						<div className="flex justify-end">
							<Button
								variant="secondary"
								onClick={() => {
									setHistoryOpen(false);
								}}
							>
								{t(`${key}.close`)}
							</Button>
						</div>
					}
					onClose={() => {
						setHistoryOpen(false);
					}}
				>
					<DataTable
						columns={columns}
						getRowId={(entry) => entry.id}
						label={t(`${key}.historyTitle`)}
						data={balance.entries.map((entry, index) => ({
							...entry,
							id: `${index}`,
						}))}
					/>
				</Dialog>
			)}
		</span>
	);
};
