import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { formatDayAndMonth } from "@/features/scheduling/months/monthWeeks";
import { dayMarkLooks } from "@/features/scheduling/timeline/dayMarkLooks";
import type { DepartmentCardEntry } from "@/features/scheduling/timeline/departmentCards";

export type DepartmentCardProps = {
	card: DepartmentCardEntry;
	/** Today as an ISO date: a published run that ends before it is called out. */
	today: string;
	className?: string;
};

const key = "scheduling.timeline.card";

/**
 * One Department on the Scheduling landing: Open schedule, a bar per day
 * from today, how far it is published, what is to review, where the
 * schedules stop, and what waits on the manager.
 */
export const DepartmentCard = ({
	card,
	today,
	className,
}: DepartmentCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = formattingLocale(i18n);
	const dayText = (day: string): string => formatDayAndMonth(day, language);
	// Published only up to a day before today, or not at all: staff are not covered from today.
	const publishedFallsShort =
		card.publishedUpTo === undefined || card.publishedUpTo < today;

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
					{card.departmentName}
				</h3>
				<Button
					search={{ department: card.departmentId }}
					to="/scheduling/department"
					variant="textlink"
					aria-label={t(`${key}.openNamed`, {
						department: card.departmentName,
					})}
				>
					{t(`${key}.open`)}
				</Button>
			</div>
			<div aria-hidden="true" className="flex gap-0.5">
				{card.dayStrip.map(({ day, mark }) => (
					<span
						key={day}
						className={joinClassNames(
							"h-1.5 flex-1 rounded-sm",
							dayMarkLooks[mark]
						)}
					/>
				))}
			</div>
			<p
				className={joinClassNames(
					"text-sm",
					publishedFallsShort
						? "font-medium text-error-700"
						: "text-neutral-800"
				)}
			>
				{card.publishedUpTo === undefined
					? t(`${key}.nothingPublished`)
					: t(`${key}.publishedUpTo`, { day: dayText(card.publishedUpTo) })}
			</p>
			<p className="text-sm text-neutral-800">
				{card.toReviewCount > 0
					? t(`${key}.toReview`, { count: card.toReviewCount })
					: t(`${key}.nothingToReview`)}
			</p>
			<p className="text-sm text-neutral-800">
				{card.scheduledUpTo === undefined
					? t(`${key}.noSchedule`)
					: t(`${key}.scheduledUpTo`, { day: dayText(card.scheduledUpTo) })}
			</p>
			<p className="text-sm text-neutral-800">
				{card.nextToReview === undefined
					? t(`${key}.nothingWaiting`)
					: t(`${key}.waiting`, { name: card.nextToReview })}
			</p>
		</section>
	);
};
