import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { DayRun } from "@/features/scheduling/dates/api";
import { dayCountOfRuns } from "@/features/scheduling/dates/datesSetup";
import type { ReplacedDays } from "@/features/scheduling/dates/replacedDays";
import { formatPeriod } from "@/features/scheduling/periods";

export type ReplaceRosterDialogProps = {
	/** What generating replaces, from `replacedDaysOf`. */
	replaces: ReplacedDays;
	/** Generate, replacing the roster to review. */
	onConfirm: () => void;
	onClose: () => void;
};

const key = "scheduling.dates.replace";

/**
 * Asks before a run by dates replaces a roster to review, naming its days.
 * A roster staff saw (published, then withdrawn) says so, that the new one
 * must be published for them to see it, and draws Confirm red; hand changes
 * the run replaces are counted. Published days are never replaced.
 */
export const ReplaceRosterDialog = ({
	replaces,
	onConfirm,
	onClose,
}: ReplaceRosterDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const daysText = (runs: ReadonlyArray<DayRun>): string =>
		new Intl.ListFormat(language, { type: "conjunction" }).format(
			runs.map((run) =>
				formatPeriod({ start: run.from, end: run.to }, language)
			)
		);
	const { days, seenByStaff, handChanges } = replaces;
	const seen = seenByStaff.length > 0;
	return (
		<ConfirmDialog
			cancelLabel={t(`${key}.cancel`)}
			confirmLabel={t(`${key}.confirm`)}
			title={t(`${key}.title`)}
			tone={seen ? "danger" : "default"}
			description={t(`${key}.body`, {
				days: daysText(days),
				count: dayCountOfRuns(days),
			})}
			onClose={onClose}
			onConfirm={onConfirm}
		>
			<ul className="mb-6 list-disc space-y-1 pl-5 text-sm">
				{seen && <li>{t(`${key}.seen`, { days: daysText(seenByStaff) })}</li>}
				{seen && <li>{t(`${key}.publishAgain`)}</li>}
				{handChanges > 0 && (
					<li>{t(`${key}.handChanges`, { count: handChanges })}</li>
				)}
				<li>{t(`${key}.publishedStay`)}</li>
			</ul>
		</ConfirmDialog>
	);
};
