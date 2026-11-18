import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import {
	dayCountOfRuns,
	type PlanRow,
} from "@/features/scheduling/dates/datesSetup";
import { formatPeriod } from "@/features/scheduling/periods";

export type PlanRowDatesProps = {
	/** One week of the dates plan, laid out. */
	row: PlanRow;
};

/**
 * One week's dates in "What this creates": its asked days, a line per run of
 * days saying what generating does with them, and, for a week that will hold
 * several schedules, which they are and that each is reviewed and published
 * on its own.
 */
export const PlanRowDates = ({ row }: PlanRowDatesProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const datesText = (start: string, end: string): string =>
		formatPeriod({ start, end }, language);
	const schedulesText = new Intl.ListFormat(language, {
		type: "conjunction",
	}).format(row.schedules.map((run) => datesText(run.from, run.to)));
	return (
		<span className="flex flex-col">
			<span>{datesText(row.asked.start, row.asked.end)}</span>
			{row.lines.map((line) => (
				<span key={line.days.from} className="text-xs text-neutral-700">
					{t(`scheduling.dates.setup.${line.kind}Line`, {
						days: datesText(line.days.from, line.days.to),
						count: dayCountOfRuns([line.days]),
					})}
				</span>
			))}
			{row.schedules.length > 1 && (
				<span className="text-xs font-semibold text-neutral-900">
					{t("scheduling.dates.setup.schedulesLine", {
						number: row.schedules.length,
						days: schedulesText,
					})}
				</span>
			)}
		</span>
	);
};
