import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LeaveIcon } from "@/components/ui/Icon";
import type { DayOff } from "@/features/dashboard/api";
import {
	emptyLineClasses,
	failedLineClasses,
	rowClasses,
	rowDetailClasses,
	rowListClasses,
	rowTitleClasses,
} from "@/features/dashboard/cardStyles";
import { formatDay } from "@/common/formatDay";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import { offByDay, type PersonOff } from "@/features/dashboard/offToday";
import type { LeaveRequest } from "@/features/leave/api";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";

const key = "dashboard.cards.offToday";

export type OffTodayCardProps = {
	/** Today and tomorrow, as ISO dates. */
	days: [string, string];
	/** Approved leave sharing a day with today or tomorrow. */
	leave: GuardedRead<Array<LeaveRequest>>;
	/** Rostered days off today and tomorrow. */
	daysOff: GuardedRead<Array<DayOff>>;
	className?: string;
};

/** Why one person is off, in the card's words. */
const reasonOf = (person: PersonOff, t: TFunction): string =>
	person.kind === "leave"
		? leaveTypeLabel(person.request, t)
		: (person.dayTypeName ?? t(`${key}.dayOff`));

/**
 * Who is off today and tomorrow in the person's units: approved leave and
 * rostered days off. Shown when either read is in reach; leads to the
 * leave list.
 */
export const OffTodayCard = ({
	days,
	leave,
	daysOff,
	className,
}: OffTodayCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	if (leave.status === "hidden" && daysOff.status === "hidden") return null;
	const groups = offByDay(
		days,
		leave.status === "ready" ? leave.data : [],
		daysOff.status === "ready" ? daysOff.data : []
	);
	const failed = leave.status === "error" || daysOff.status === "error";
	return (
		<Card
			className={className}
			icon={LeaveIcon}
			title={t(`${key}.title`)}
			action={
				leave.status === "hidden" ? undefined : (
					<Button size="sm" to="/leave" variant="textlink">
						{t(`${key}.seeLeave`)}
					</Button>
				)
			}
		>
			{failed && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{groups.map((group, index) => (
				<div key={group.day} className="flex flex-col gap-2">
					<h3 className={rowTitleClasses}>
						{t(index === 0 ? `${key}.today` : `${key}.tomorrow`, {
							day: formatDay(group.day, language),
						})}
					</h3>
					{group.people.length === 0 ? (
						<p className={emptyLineClasses}>{t(`${key}.nobody`)}</p>
					) : (
						<ul className={rowListClasses}>
							{group.people.map((person) => (
								<li key={person.key} className={rowClasses}>
									<span className={rowDetailClasses}>
										{t(`${key}.person`, {
											name: person.name ?? t(`${key}.formerMember`),
											reason: reasonOf(person, t),
										})}
									</span>
								</li>
							))}
						</ul>
					)}
				</div>
			))}
		</Card>
	);
};
