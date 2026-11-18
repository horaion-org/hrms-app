import { useId } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { MonthWeek } from "@/features/scheduling/months/api";
import { namedSpansOf } from "@/features/scheduling/dates/datesSetup";
import { DayCoverMarks } from "@/features/scheduling/months/DayCoverMarks";
import { formatWeekDates } from "@/features/scheduling/months/monthWeeks";
import { listsWeekParts } from "@/features/scheduling/months/rosterWeeks";
import { WeekPartLinks } from "@/features/scheduling/months/WeekPartLinks";
import { weekHeadline } from "@/features/scheduling/months/weekHeadline";
import {
	hasRoster,
	showsCoverSummary,
	weekAction,
	weekStateTones,
} from "@/features/scheduling/months/weekStateLooks";
import { refusalOfCode } from "@/features/scheduling/schedules/scheduleRefusal";
import { scheduleViewLink } from "@/features/scheduling/schedules/scheduleViewLink";

export type WeekCardProps = {
	week: MonthWeek;
	/**
	 * Why the week's newest run gave no roster, in today's failure words: a
	 * failed week, or a week whose regeneration failed and kept its roster.
	 */
	failureMessage?: string;
	/** Why the last month run refused this week, in today's refusal words. */
	refusal?: string;
	/** The dates of the month's failed week, named when its failure took this week out of the queue. */
	failedWeek?: string;
	/** The week's Department, for the link to a draft's setup. */
	departmentId: string;
	className?: string;
};

const key = "scheduling.months";

/**
 * What a week of one part says (API ADR-0113): the days that part covers,
 * named when a manager named it; nothing for a week one schedule covers
 * whole. A week of several parts lists them instead (`WeekPartLinks`).
 */
const coversLineOf = (
	week: MonthWeek,
	datesOf: (from: string, to: string) => string,
	t: TFunction
): string | undefined => {
	const { coveredFrom, coveredTo } = week;
	if (!coveredFrom || !coveredTo) return undefined;
	if (coveredFrom === week.periodStart && coveredTo === week.periodEnd)
		return undefined;
	const range = datesOf(coveredFrom, coveredTo);
	const named = namedSpansOf(week.parts).find(
		(span) => span.from <= coveredFrom && span.to >= coveredTo
	);
	return named
		? t(`${key}.cover.coversNamed`, { name: named.name, range })
		: t(`${key}.cover.covers`, { range });
};

/**
 * One week of a Department's month: its dates, its state, its seven days'
 * cover and how many were changed by hand, and one action: Review on the
 * week under review, Open on any other week with a schedule (a draft opens
 * its setup, any other its roster), none on a week not generated yet. A week
 * of several schedules shows the state of its part needing attention first
 * (a published newest part never hides an earlier one to review), lists
 * each part by its days and state, each opening its own roster, and offers
 * Review on the first part to review. A
 * week not generated has a dashed frame: it is not final. A failed
 * week says why, and so does a week whose regeneration failed and that shows
 * its earlier roster; a week the last month run refused, or one a month run took
 * out of its queue, says why too (the last run's refusal first); a week whose
 * rules changed since it was generated says so. A week being generated shows
 * its state only.
 */
export const WeekCard = ({
	week,
	failureMessage,
	refusal,
	failedWeek,
	departmentId,
	className,
}: WeekCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const dates = formatWeekDates(
		{ start: week.periodStart, end: week.periodEnd },
		formattingLocale(i18n)
	);
	const headline = weekHeadline(week);
	const action = weekAction(headline);
	const shortShifts = week.days.reduce((sum, day) => sum + day.shortShifts, 0);
	const handChangedDays = week.handChangedDays ?? 0;
	const dashed = week.state === "NOT_GENERATED";
	const datesOf = (from: string, to: string): string =>
		formatWeekDates({ start: from, end: to }, formattingLocale(i18n));
	const severalParts = listsWeekParts(week.parts);
	const coversLine = severalParts ? undefined : coversLineOf(week, datesOf, t);
	// A week with a roster whose newest run failed kept its earlier roster (API ADR-0112).
	const failureLine = !failureMessage
		? undefined
		: week.state === "FAILED"
			? failureMessage
			: hasRoster(week.state)
				? t("scheduling.generation.regenerationFailed", {
						reason: failureMessage,
					})
				: undefined;
	const refusalWords =
		refusal ??
		(week.queueRefusal
			? refusalOfCode(week.queueRefusal.code, t, failedWeek)
			: undefined);

	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				// Five to a row from xl: the smaller padding keeps every state's words whole.
				"flex min-w-0 flex-col gap-3 rounded-xl border border-neutral-400 bg-white p-6 xl:p-4",
				dashed && "border-dashed",
				className
			)}
		>
			{/* Stacked, so the badge keeps its words in a fifth of the page's width. */}
			<div className="flex flex-col items-start gap-2">
				<h2 className="text-base font-bold text-neutral-900" id={titleId}>
					{dates}
				</h2>
				<Badge tone={weekStateTones[headline.state]}>
					{t(`${key}.states.${headline.state}`)}
				</Badge>
			</div>
			{coversLine && <p className="text-sm text-neutral-800">{coversLine}</p>}
			{failureLine && <p className="text-sm text-neutral-800">{failureLine}</p>}
			{week.rulesChanged === true && (
				<p className="text-sm text-neutral-800">{t(`${key}.rulesChanged`)}</p>
			)}
			{refusalWords && (
				<p className="text-sm text-neutral-800">
					{t(`${key}.generate.refused`, { reason: refusalWords })}
				</p>
			)}
			<DayCoverMarks days={week.days} />
			{showsCoverSummary(week) && (
				<div className="text-sm text-neutral-800">
					<p>
						{shortShifts > 0
							? t(`${key}.cover.shiftsShort`, { count: shortShifts })
							: t(`${key}.cover.everyShiftCovered`)}
					</p>
					{handChangedDays > 0 && (
						<p>{t(`${key}.cover.handChanged`, { count: handChangedDays })}</p>
					)}
				</div>
			)}
			{severalParts && (
				<WeekPartLinks
					className="mt-auto"
					departmentId={departmentId}
					parts={week.parts}
				/>
			)}
			{/* A week of several schedules opens each from its list; Review still leads to the part to review. */}
			{action &&
				headline.scheduleId &&
				(!severalParts || action === "review") && (
					<Button
						{...scheduleViewLink({
							scheduleId: headline.scheduleId,
							departmentId,
							// Only a draft opens elsewhere (its setup); every other week opens its roster.
							status: headline.state === "DRAFT" ? "DRAFT" : "GENERATED",
						})}
						className="mt-auto self-start"
						variant={action === "review" ? "primary" : "secondary"}
						aria-label={t(
							action === "review"
								? `${key}.actions.reviewWeek`
								: `${key}.actions.openWeek`,
							{ week: dates }
						)}
					>
						{t(
							action === "review"
								? `${key}.actions.review`
								: `${key}.actions.open`
						)}
					</Button>
				)}
		</section>
	);
};
