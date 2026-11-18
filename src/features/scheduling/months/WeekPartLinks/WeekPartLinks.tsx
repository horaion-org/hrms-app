import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { WeekPart } from "@/features/scheduling/months/api";
import { formatPartDays } from "@/features/scheduling/months/monthWeeks";
import { weekScheduleLink } from "@/features/scheduling/months/rosterWeeks";
import { weekStateTones } from "@/features/scheduling/months/weekStateLooks";

export type WeekPartLinksProps = {
	/** The week's schedules, in day order (the month read's `parts`). */
	parts: ReadonlyArray<WeekPart>;
	/** The week's Department: a draft opens its setup there. */
	departmentId: string;
	/** The schedule open on this page, marked as current instead of linked; none on the month page. */
	currentScheduleId?: string;
	className?: string;
};

/**
 * "Schedules this week": each schedule of a week by its days and state, in
 * day order, each opening its own roster (a draft its setup); the one open
 * on the page is marked as current.
 */
export const WeekPartLinks = ({
	parts,
	departmentId,
	currentScheduleId,
	className,
}: WeekPartLinksProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const labelId = useId();
	return (
		<nav
			aria-labelledby={labelId}
			className={joinClassNames(
				"flex flex-wrap items-center gap-x-4 gap-y-2 text-sm",
				className
			)}
		>
			<span className="font-semibold text-neutral-900" id={labelId}>
				{t("scheduling.roster.schedulesThisWeek")}
			</span>
			<ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
				{parts.map((part) => {
					const days = formatPartDays(
						{ start: part.coveredFrom, end: part.coveredTo },
						language
					);
					return (
						// Wraps the badge under the days on a narrow card, never into its letters.
						<li
							key={part.scheduleId}
							className="flex flex-wrap items-center gap-x-2 gap-y-1"
						>
							{part.scheduleId === currentScheduleId ? (
								<span
									aria-current="true"
									className="font-semibold text-neutral-900"
								>
									{days}
								</span>
							) : (
								<Button
									{...weekScheduleLink(part, departmentId)}
									variant="textlink"
								>
									{days}
								</Button>
							)}
							<Badge
								compact
								className="shrink-0 whitespace-nowrap"
								tone={weekStateTones[part.state]}
							>
								{t(`scheduling.months.states.${part.state}`)}
							</Badge>
						</li>
					);
				})}
			</ul>
		</nav>
	);
};
