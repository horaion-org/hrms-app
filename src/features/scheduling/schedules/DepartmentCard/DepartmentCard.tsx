import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { formatDayAndMonth } from "@/features/scheduling/months/monthWeeks";
import { formatPeriod } from "@/features/scheduling/periods";
import { dayMarkLooks } from "@/features/scheduling/schedules/dayMarkLooks";
import {
	dayCountOfRun,
	showsYear,
	type DepartmentCardEntry,
	type PublishedStanding,
} from "@/features/scheduling/schedules/departmentCards";

export type DepartmentCardProps = {
	card: DepartmentCardEntry;
	/** Today as an ISO date: a published run that ends before it is called out. */
	today: string;
	className?: string;
};

const key = "scheduling.timeline.card";

/** The published line for each standing; only "upTo" names a day. */
const PUBLISHED_LINE_KEYS = {
	upTo: `${key}.publishedUpTo`,
	notFromThisWeek: `${key}.notPublishedFromThisWeek`,
	nothing: `${key}.nothingPublished`,
} as const satisfies Record<PublishedStanding, string>;

/**
 * A card line that names a day: a link to the Department's timeline on that
 * day's week, by the route's path as "Open roster" links (schedules/ may
 * not import timeline/).
 */
const DayLink = ({
	card,
	day,
	dayText,
	children,
}: {
	card: DepartmentCardEntry;
	day: string;
	dayText: string;
	children: ReactNode;
}): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button
			search={{ department: card.departmentId, from: mondayOf(day) }}
			to="/scheduling/department"
			variant="textlink"
			aria-label={t(`${key}.openAt`, {
				department: card.departmentName,
				day: dayText,
			})}
		>
			{children}
		</Button>
	);
};

/**
 * One Department on the Scheduling landing: Open roster, a bar per day
 * from today, how far it is published, how many days are to review, where
 * the roster stops, and which days wait for the manager to publish.
 */
export const DepartmentCard = ({
	card,
	today,
	className,
}: DepartmentCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = formattingLocale(i18n);
	// A day of another year names it, as the history's periods do; this year's reads short.
	const dayText = (day: string): string =>
		showsYear(day, today)
			? formatPeriod({ start: day, end: day }, language)
			: formatDayAndMonth(day, language);
	// Published only up to a day before today, or not from this week: staff are not covered from today.
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
				{card.publishedUpTo === undefined ? (
					t(PUBLISHED_LINE_KEYS[card.publishedStanding])
				) : (
					<DayLink
						card={card}
						day={card.publishedUpTo}
						dayText={dayText(card.publishedUpTo)}
					>
						{t(PUBLISHED_LINE_KEYS[card.publishedStanding], {
							day: dayText(card.publishedUpTo),
						})}
					</DayLink>
				)}
			</p>
			<p className="text-sm text-neutral-800">
				{card.firstToReviewDay === undefined ? (
					t(`${key}.nothingToReview`)
				) : (
					<DayLink
						card={card}
						day={card.firstToReviewDay}
						dayText={dayText(card.firstToReviewDay)}
					>
						{t(`${key}.toReviewDays`, { count: card.toReviewDays })}
					</DayLink>
				)}
			</p>
			<p className="text-sm text-neutral-800">
				{card.scheduledUpTo === undefined ? (
					t(`${key}.noSchedule`)
				) : (
					<DayLink
						card={card}
						day={card.scheduledUpTo}
						dayText={dayText(card.scheduledUpTo)}
					>
						{t(`${key}.scheduledUpTo`, { day: dayText(card.scheduledUpTo) })}
					</DayLink>
				)}
			</p>
			<p className="text-sm text-neutral-800">
				{card.waitingDays === undefined
					? t(`${key}.nothingWaiting`)
					: t(`${key}.waitingDays`, {
							days: formatPeriod(
								{ start: card.waitingDays.from, end: card.waitingDays.to },
								language
							),
							count: dayCountOfRun(card.waitingDays),
						})}
			</p>
		</section>
	);
};
