import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { MonthWeek } from "@/features/scheduling/months/api";
import { DayCoverMarks } from "@/features/scheduling/months/DayCoverMarks";
import { formatWeekDates } from "@/features/scheduling/months/monthWeeks";
import {
	hasRoster,
	weekAction,
	weekStateTones,
} from "@/features/scheduling/months/weekStateLooks";
import { scheduleViewLink } from "@/features/scheduling/schedules/scheduleViewLink";

export type WeekCardProps = {
	week: MonthWeek;
	/** The week's Department, for the link to a draft's setup. */
	departmentId: string;
	className?: string;
};

const key = "scheduling.months";

/**
 * One week of a Department's month: its dates, its state, its seven days'
 * cover and how many were changed by hand, and one action: Review on the
 * week under review, Open on any other week with a schedule (a draft opens
 * its setup, any other its roster), none on a week not generated yet. A
 * tentative or missing week has a dashed frame: it is not final.
 */
export const WeekCard = ({
	week,
	departmentId,
	className,
}: WeekCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const dates = formatWeekDates(
		{ start: week.periodStart, end: week.periodEnd },
		formattingLocale(i18n)
	);
	const action = weekAction(week);
	const shortShifts = week.days.reduce((sum, day) => sum + day.shortShifts, 0);
	const handChangedDays = week.handChangedDays ?? 0;
	const dashed = week.state === "TENTATIVE" || week.state === "NOT_GENERATED";

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
				<Badge tone={weekStateTones[week.state]}>
					{t(`${key}.states.${week.state}`)}
				</Badge>
			</div>
			<DayCoverMarks days={week.days} />
			{hasRoster(week.state) && (
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
			{action && week.scheduleId && (
				<Button
					{...scheduleViewLink({
						scheduleId: week.scheduleId,
						departmentId,
						// Only a draft opens elsewhere (its setup); every other week opens its roster.
						status: week.state === "DRAFT" ? "DRAFT" : "GENERATED",
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
