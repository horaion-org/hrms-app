import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { formatPeriod } from "@/features/scheduling/periods";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { rosterStatusBadge } from "@/features/scheduling/schedules/publishOrder";

export type RosterHeaderProps = {
	schedule: Schedule;
	/**
	 * Placed at the right: the state's one primary action and the "More
	 * actions" menu. A caller may let them join this row's flex on a phone
	 * (`max-sm:contents`), so the menu sits beside the title.
	 */
	actions?: ReactNode;
	/** Said after the status, e.g. where the roster's approval stands. */
	meta?: ReactNode;
	className?: string;
};

const key = "scheduling.detail";

/**
 * The top of a schedule's roster, kept to two lines: its department, then
 * its period, status (with any approval line `meta` says) and time zone.
 * Who requested and decided it, and when, are in the "More actions" menu's
 * Details.
 */
export const RosterHeader = ({
	schedule,
	actions,
	meta,
	className,
}: RosterHeaderProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const badge = rosterStatusBadge(schedule);
	return (
		<div
			className={joinClassNames(
				"flex flex-wrap items-start justify-between gap-x-6 gap-y-4",
				className
			)}
		>
			{/* On a phone the title takes the row beside the actions' menu (see `actions`). */}
			<div className="min-w-0 max-sm:flex-1">
				<h1 className="text-4xl font-medium text-neutral-900">
					{t(`${key}.title`, { department: schedule.departmentName })}
				</h1>
				<p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-neutral-800">
					{formatPeriod(
						{ start: schedule.periodStart, end: schedule.periodEnd },
						language
					)}
					<Badge className="uppercase" tone={badge.tone}>
						{t(badge.labelKey)}
					</Badge>
					{meta}
					<span className="text-xs font-normal text-neutral-700">
						{t(`${key}.timeZone`, { timeZone: schedule.timeZone })}
					</span>
				</p>
			</div>
			{actions}
		</div>
	);
};
