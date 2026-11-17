import type { ReactNode } from "react";
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
	formatMonth,
	formatWeekDates,
} from "@/features/scheduling/months/monthWeeks";
import { weekChangedRefusal } from "@/features/scheduling/months/monthCopy";
import { useGenerateMonth } from "@/features/scheduling/months/useGenerateMonth";
import { monthGenerationRefusal } from "@/features/scheduling/schedules/scheduleRefusal";

export type RegenerateMonthDialogProps = {
	companyId: string;
	/** The Department's month, already read: the dialog names only weeks it has read. */
	month: ScheduleMonth;
	onClose: () => void;
	/** Told the run's answer once it started, before the dialog closes. */
	onStarted?: (answer: MonthGeneration) => void;
	/** A line shown first, such as the hours worked this month that are still unknown. */
	notice?: ReactNode;
	/**
	 * The Mondays to generate again, first week first (e.g. "Try again" after a
	 * failed week); without it, every covered week of the month.
	 */
	weeks?: ReadonlyArray<string>;
};

const key = "scheduling.months.regenerate";

/**
 * Asks before generating a month again: which weeks are worked out again
 * (every week that isn't published, from its first on; with `weeks`, the
 * first of them and how many follow), that the current roster stays until
 * the new one is ready (API ADR-0112), and which of those weeks' hand changes
 * are replaced, which asks in red. Confirming posts the month (only `weeks`
 * when given) through useGenerateMonth; a refusal shows inside the dialog.
 */
export const RegenerateMonthDialog = ({
	companyId,
	month,
	onClose,
	onStarted,
	notice,
	weeks,
}: RegenerateMonthDialogProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const generation = useGenerateMonth(companyId, month, weeks);
	const monthName = formatMonth(month.month, language);
	const covered = coveredWeeks(month);
	const handChanged = handChangedCoveredWeeks(month, weeks);
	const weekLabel = (week: {
		periodStart: string;
		periodEnd: string;
	}): string =>
		formatWeekDates({ start: week.periodStart, end: week.periodEnd }, language);
	const firstCovered = covered[0];
	const somePublished = month.weeks.some((week) => week.state === "PUBLISHED");
	// Only with `weeks`: the first of them, named with how many follow it.
	const [firstChosen] = month.weeks.filter((week) =>
		weeks?.includes(week.periodStart)
	);
	const weeksWorkedOut = firstChosen
		? t(`${key}.chosenWeeks`, {
				count: (weeks?.length ?? 1) - 1,
				first: weekLabel(firstChosen),
			})
		: somePublished && firstCovered
			? t(`${key}.someWeeks`, {
					count: covered.length,
					month: monthName,
					from: weekLabel(firstCovered),
				})
			: t(`${key}.allWeeks`, { count: covered.length, month: monthName });
	// Said every time: a failed run no longer takes the roster with it.
	const description = `${weeksWorkedOut} ${t(`${key}.keptUntilReady`)}`;
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
			description={description}
			submitting={generation.isPending}
			tone={handChanged.length > 0 ? "danger" : "default"}
			confirmLabel={
				weeks
					? t(`${key}.chosenConfirm`)
					: t(`${key}.confirm`, { month: monthName })
			}
			error={
				generation.error
					? monthGenerationRefusal(
							generation.error,
							t,
							weekChangedRefusal(generation.sentWeeks, month, language, t)
						)
					: undefined
			}
			title={
				weeks
					? t(`${key}.chosenTitle`)
					: t(`${key}.title`, { month: monthName })
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
			{notice}
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
