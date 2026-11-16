import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TimeIcon } from "@/components/ui/Icon";
import type { Overtime, OvertimeStanding } from "@/features/dashboard/api";
import {
	CARD_ROW_LIMIT,
	emptyLineClasses,
	failedLineClasses,
	rowClasses,
	rowDetailClasses,
	rowListClasses,
	rowTitleClasses,
} from "@/features/dashboard/cardStyles";
import { peopleNearLimit } from "@/features/dashboard/closeToLimit";
import { hoursLabel } from "@/features/dashboard/dashboardDates";
import type { GuardedRead } from "@/features/dashboard/guardedRead";

const key = "dashboard.cards.closeToLimit";

/** Over the ceiling reads as an error, near it as a warning. */
const STANDING_TONES: Record<OvertimeStanding, BadgeTone> = {
	OVER: "error",
	NEAR: "warning",
};

export type CloseToLimitCardProps = {
	/** This month's overtime by department. */
	overtime: GuardedRead<Overtime>;
	className?: string;
};

/**
 * The people at or over the company's share of the monthly overtime
 * ceiling this month, from the hours rostered. Leads to Insights for the
 * whole picture. Shown only where rosters may be read.
 */
export const CloseToLimitCard = ({
	overtime,
	className,
}: CloseToLimitCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	if (overtime.status === "hidden") return null;
	const answer = overtime.status === "ready" ? overtime.data : undefined;
	const people = answer ? peopleNearLimit(answer) : [];
	const noCeiling =
		answer !== undefined &&
		answer.departments.length > 0 &&
		answer.departments.every(
			(department) => department.ceilingMinutes === null
		);
	return (
		<Card
			className={className}
			icon={TimeIcon}
			title={t(`${key}.title`)}
			action={
				<Button size="sm" to="/insights" variant="textlink">
					{t(`${key}.seeInsights`)}
				</Button>
			}
		>
			{answer && (
				<p className={rowDetailClasses}>
					{t(`${key}.share`, { share: answer.nearSharePercent })}
				</p>
			)}
			{overtime.status === "error" && (
				<p className={failedLineClasses} role="alert">
					{t(`${key}.failed`)}
				</p>
			)}
			{noCeiling && <p className={emptyLineClasses}>{t(`${key}.noCeiling`)}</p>}
			{answer && !noCeiling && people.length === 0 && (
				<p className={emptyLineClasses}>{t(`${key}.empty`)}</p>
			)}
			{people.length > 0 && (
				<ul className={rowListClasses}>
					{people.slice(0, CARD_ROW_LIMIT).map((person) => (
						<li key={person.membershipId} className={rowClasses}>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className={rowTitleClasses}>
									{person.displayName ?? t(`${key}.formerMember`)}
								</span>
								<Badge tone={STANDING_TONES[person.standing]}>
									{t(`${key}.standing.${person.standing}`)}
								</Badge>
							</div>
							<span className={rowDetailClasses}>
								{t(`${key}.hours`, {
									hours: hoursLabel(person.overtimeMinutes, language),
									ceiling: hoursLabel(person.ceilingMinutes, language),
									department: person.departmentName,
								})}
							</span>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
};
