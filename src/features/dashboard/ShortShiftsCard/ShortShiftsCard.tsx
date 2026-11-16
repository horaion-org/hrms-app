import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { mondayOf } from "@/common/weeks";
import { Card } from "@/components/ui/Card";
import { ExpandableList } from "@/components/ui/ExpandableList";
import { FillShiftsIcon } from "@/components/ui/Icon";
import type { Shortage } from "@/features/dashboard/api";
import {
	cardLinkClasses,
	emptyLineClasses,
	failedLineClasses,
	rowClasses,
	rowDetailClasses,
	rowListClasses,
} from "@/features/dashboard/cardStyles";
import { dayLabel } from "@/features/dashboard/dashboardDates";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import { coverParameter } from "@/features/scheduling/roster/rosterSearch";

const key = "dashboard.cards.shortShifts";

export type ShortShiftsCardProps = {
	/** The shifts short this week and next, most urgent first. */
	shortages: GuardedRead<Array<Shortage>>;
	className?: string;
};

/**
 * The shifts short this week and next. Each opens its roster on that week
 * and day with Find cover for the shift, where the repair options are.
 * Shown only where rosters may be read.
 */
export const ShortShiftsCard = ({
	shortages,
	className,
}: ShortShiftsCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	if (shortages.status === "hidden") return null;
	const rows = shortages.status === "ready" ? shortages.data : [];
	return (
		<Card className={className} icon={FillShiftsIcon} title={t(`${key}.title`)}>
			<p className={rowDetailClasses}>{t(`${key}.range`)}</p>
			{shortages.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{shortages.status === "ready" && rows.length === 0 && (
				<p className={emptyLineClasses}>{t(`${key}.empty`)}</p>
			)}
			{rows.length > 0 && (
				<ExpandableList
					itemClassName={rowClasses}
					items={rows}
					listClassName={rowListClasses}
					keyOf={(shortage) =>
						`${shortage.scheduleId}|${shortage.shiftId}|${shortage.day}`
					}
					renderItem={(shortage) => (
						<>
							<Link
								className={cardLinkClasses}
								params={{ scheduleId: shortage.scheduleId }}
								to="/scheduling/$scheduleId"
								search={{
									week: mondayOf(shortage.day),
									day: shortage.day,
									cover: coverParameter(shortage),
								}}
							>
								{t(`${key}.shift`, {
									shift: shortage.shiftName,
									day: dayLabel(shortage.day, language),
									start: shortage.startTime,
									end: shortage.endTime,
								})}
							</Link>
							<span className={rowDetailClasses}>
								{t(`${key}.detail`, {
									department: shortage.departmentName,
									count: shortage.shortBy,
								})}
							</span>
						</>
					)}
				/>
			)}
		</Card>
	);
};
