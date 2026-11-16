import { useTranslation } from "react-i18next";
import { formatDay } from "@/common/formatDay";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { PeopleIcon } from "@/components/ui/Icon";
import type { PeopleEvent } from "@/features/dashboard/api";
import {
	emptyLineClasses,
	failedLineClasses,
	rowClasses,
	rowDetailClasses,
	rowListClasses,
	rowTitleClasses,
} from "@/features/dashboard/cardStyles";
import type { GuardedRead } from "@/features/dashboard/guardedRead";

const key = "dashboard.cards.peopleEvents";

export type PeopleEventsCardProps = {
	/** Who joins, ends probation or leaves over the coming days, by day. */
	events: GuardedRead<Array<PeopleEvent>>;
	className?: string;
};

/** A row's key: one person can have several events, but one of each kind a day. */
const keyOf = (event: PeopleEvent): string =>
	`${event.membershipId}|${event.kind}|${event.day}`;

/**
 * Who joins, whose probation ends and who leaves in the person's units over
 * the coming days, by day: the HR dates a manager prepares for.
 */
export const PeopleEventsCard = ({
	events,
	className,
}: PeopleEventsCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	if (events.status === "hidden") return null;
	return (
		<Card className={className} icon={PeopleIcon} title={t(`${key}.title`)}>
			{events.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{events.status === "ready" && events.data.length === 0 && (
				<p className={emptyLineClasses}>{t(`${key}.empty`)}</p>
			)}
			{events.status === "ready" && events.data.length > 0 && (
				<ExpandableList
					itemClassName={rowClasses}
					items={events.data}
					keyOf={keyOf}
					listClassName={rowListClasses}
					renderItem={(event) => (
						<>
							<span className={rowTitleClasses}>
								{t(`${key}.kinds.${event.kind}`, {
									name: event.displayName ?? t(`${key}.formerMember`),
								})}
							</span>
							<span className={rowDetailClasses}>
								{t(`${key}.detail`, {
									day: formatDay(event.day, language),
									department: event.departmentName,
								})}
							</span>
						</>
					)}
				/>
			)}
		</Card>
	);
};
