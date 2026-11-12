import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import type { ApprovalInstance } from "@/features/approvals/api";
import { stepValues } from "@/features/approvals/approvalStanding";
import type {
	ScheduleMonthSummary,
	WeekState,
} from "@/features/scheduling/months/api";
import { weekWaitingOnMe } from "@/features/scheduling/months/monthApprovals";
import {
	formatDayAndMonth,
	formatMonth,
	formatMonthName,
} from "@/features/scheduling/months/monthWeeks";
import { stateCountsLine } from "@/features/scheduling/months/monthCopy";

export type MonthCardProps = {
	summary: ScheduleMonthSummary;
	/** Set when this Department's week under review is in another month, which comes first. */
	reviewMonth?: string;
	/** The approvals waiting on the person (`myPendingApprovalsQuery`); empty for someone who decides none. */
	waitingOnMe: ReadonlyArray<ApprovalInstance>;
	className?: string;
};

const key = "scheduling.months";

/** A week's small mark on the card: published, to review, tentative, or none (every other state). */
const weekMarkLook = (state: WeekState): string => {
	switch (state) {
		case "PUBLISHED":
			return "bg-success-900";
		case "TO_REVIEW":
			return "bg-ink-blue-700";
		case "TENTATIVE":
			return "border border-dashed border-neutral-700";
		default:
			return "bg-neutral-300";
	}
};

/**
 * One Department's month on the Schedules tab: a mark per week, how many
 * weeks are in which state, the week waiting on the person when one is,
 * what to do next, and Open month.
 */
export const MonthCard = ({
	summary,
	reviewMonth,
	waitingOnMe,
	className,
}: MonthCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = formattingLocale(i18n);
	const counts = stateCountsLine(summary.weeks, t);
	const mine = weekWaitingOnMe(summary, waitingOnMe);
	const toReview = summary.weeks.find((week) => week.state === "TO_REVIEW");
	const month = formatMonth(summary.month, language);

	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"flex min-w-0 flex-col gap-3 rounded-xl border border-neutral-400 bg-neutral-100 p-6",
				className
			)}
		>
			<div className="flex items-center justify-between gap-4">
				<h3
					className="truncate text-xl font-bold text-neutral-900"
					id={titleId}
				>
					{summary.departmentName}
				</h3>
				<Button
					params={{ month: summary.month }}
					search={{ department: summary.departmentId }}
					to="/scheduling/months/$month"
					variant="textlink"
					aria-label={t(`${key}.actions.openMonthNamed`, {
						department: summary.departmentName,
						month,
					})}
				>
					{t(`${key}.actions.openMonth`)}
				</Button>
			</div>
			<div aria-label={counts} className="flex gap-1" role="img">
				{summary.weeks.map((week) => (
					<span
						key={week.periodStart}
						aria-hidden="true"
						className={joinClassNames(
							"h-2 w-6 rounded-sm",
							weekMarkLook(week.state)
						)}
					/>
				))}
			</div>
			<p className="text-sm text-neutral-800">{counts}</p>
			{mine && (
				<p className="text-sm font-medium text-neutral-800">
					{t(`${key}.waitingOnYou`, {
						week: formatDayAndMonth(mine.periodStart, language),
						...stepValues(mine.step),
					})}
				</p>
			)}
			{toReview && (
				<p className="text-sm text-neutral-800">
					{t(`${key}.hints.toReview`, {
						week: formatDayAndMonth(toReview.periodStart, language),
					})}
				</p>
			)}
			{!toReview && reviewMonth && (
				<p className="text-sm text-neutral-800">
					{t(`${key}.hints.generatedAhead`, {
						month: formatMonthName(reviewMonth, language),
					})}
				</p>
			)}
		</section>
	);
};
