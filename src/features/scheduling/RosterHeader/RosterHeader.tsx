import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { formatPeriod } from "@/features/scheduling/periods";
import { scheduleStatusTones } from "@/features/scheduling/schedules";
import type { Schedule } from "@/features/scheduling/schedules/api";

export type RosterHeaderProps = {
	schedule: Schedule;
	/** Placed at the right: the state's one primary action and the "More actions" menu. */
	actions?: ReactNode;
	className?: string;
};

const key = "scheduling.detail";

/**
 * The top of a schedule's roster, kept to two lines: its department, then
 * its period, status and time zone. Who requested and decided it, and
 * when, are in the "More actions" menu's Details.
 */
export const RosterHeader = ({
	schedule,
	actions,
	className,
}: RosterHeaderProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	return (
		<div
			className={joinClassNames(
				"flex flex-wrap items-start justify-between gap-x-6 gap-y-4",
				className
			)}
		>
			<div>
				<h1 className="text-4xl font-medium text-neutral-900">
					{t(`${key}.title`, { department: schedule.departmentName })}
				</h1>
				<p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-neutral-800">
					{formatPeriod(
						{ start: schedule.periodStart, end: schedule.periodEnd },
						language
					)}
					<Badge
						className="uppercase"
						tone={scheduleStatusTones[schedule.status]}
					>
						{t(`scheduling.overview.statuses.${schedule.status}`)}
					</Badge>
					<span className="text-xs font-normal text-neutral-700">
						{t(`${key}.timeZone`, { timeZone: schedule.timeZone })}
					</span>
				</p>
			</div>
			{actions}
		</div>
	);
};
