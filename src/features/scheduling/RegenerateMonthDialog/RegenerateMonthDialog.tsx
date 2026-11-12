import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type {
	MonthGeneration,
	ScheduleMonth,
} from "@/features/scheduling/months/api";
import {
	coveredWeeks,
	handChangedCoveredWeeks,
} from "@/features/scheduling/months/monthGeneration";
import {
	formatMonthName,
	formatWeekDates,
} from "@/features/scheduling/months/monthWeeks";
import { useGenerateMonth } from "@/features/scheduling/months/useGenerateMonth";
import { monthGenerationRefusal } from "@/features/scheduling/schedules/scheduleRefusal";

export type RegenerateMonthDialogProps = {
	companyId: string;
	/** The Department's month, already read: the dialog names only weeks it has read. */
	month: ScheduleMonth;
	onClose: () => void;
	/** Told the run's answer once it started, before the dialog closes. */
	onStarted?: (answer: MonthGeneration) => void;
};

const key = "scheduling.months.regenerate";

/**
 * Asks before generating a month again: which weeks are worked out again
 * (every week that isn't published, from its first on) and which weeks'
 * hand changes are replaced, which asks in red. Confirming posts the month
 * through useGenerateMonth; a refusal shows inside the dialog.
 */
export const RegenerateMonthDialog = ({
	companyId,
	month,
	onClose,
	onStarted,
}: RegenerateMonthDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const generation = useGenerateMonth(companyId, month);
	const monthName = formatMonthName(month.month, language);
	const covered = coveredWeeks(month);
	const handChanged = handChangedCoveredWeeks(month);
	const weekLabel = (week: {
		periodStart: string;
		periodEnd: string;
	}): string =>
		formatWeekDates({ start: week.periodStart, end: week.periodEnd }, language);
	const firstCovered = covered[0];
	const somePublished = month.weeks.some((week) => week.state === "PUBLISHED");
	const description =
		somePublished && firstCovered
			? t(`${key}.someWeeks`, {
					count: covered.length,
					month: monthName,
					from: weekLabel(firstCovered),
				})
			: t(`${key}.allWeeks`, { count: covered.length, month: monthName });
	const blockedNote =
		generation.block === "cannotCreate"
			? t("scheduling.months.generate.cannotCreate", {
					department: month.departmentName,
				})
			: generation.block === "listsHidden"
				? t("scheduling.week.listsHiddenNote", {
						department: month.departmentName,
					})
				: undefined;

	return (
		<ConfirmDialog
			cancelLabel={t("scheduling.regenerate.cancel")}
			confirmDisabled={generation.block !== undefined}
			confirmLabel={t(`${key}.confirm`, { month: monthName })}
			description={description}
			submitting={generation.isPending}
			title={t(`${key}.title`, { month: monthName })}
			tone={handChanged.length > 0 ? "danger" : "default"}
			error={
				generation.error
					? monthGenerationRefusal(generation.error, t)
					: undefined
			}
			onClose={onClose}
			onConfirm={() => {
				generation
					.generate()
					.then((answer) => {
						onStarted?.(answer);
						onClose();
					})
					// A refusal shows from generation.error.
					.catch(() => undefined);
			}}
		>
			{handChanged.length > 0 && (
				<Callout className="mb-6" tone="warning">
					<strong>
						{t(`${key}.handChanged`, {
							count: handChanged.length,
							weeks: new Intl.ListFormat(language, {
								type: "conjunction",
							}).format(handChanged.map(weekLabel)),
						})}
					</strong>{" "}
					{t(`${key}.replaced`)}
				</Callout>
			)}
			{blockedNote && (
				<p className="mb-6 text-sm text-neutral-700">{blockedNote}</p>
			)}
		</ConfirmDialog>
	);
};
