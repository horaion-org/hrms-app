import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { formatPeriod } from "@/features/scheduling/periods";
import { dateTimeFormatIn } from "@/features/scheduling/roster/roster";
import { scheduleStatusTones } from "@/features/scheduling/schedules";
import type { Schedule } from "@/features/scheduling/schedules/api";

export type RosterHeaderProps = {
	schedule: Schedule;
	/** Placed at the right, e.g. "View setup". */
	actions?: ReactNode;
	className?: string;
};

const key = "scheduling.detail";

/**
 * The top of a schedule's roster: its department, period, status and time
 * zone, who requested its generation and when it finished.
 */
export const RosterHeader = ({
	schedule,
	actions,
	className,
}: RosterHeaderProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const moment = dateTimeFormatIn(language, schedule.timeZone, {
		dateStyle: "medium",
		timeStyle: "short",
	});
	const requestedAt =
		schedule.generationRequestedAt === null
			? undefined
			: moment.format(new Date(schedule.generationRequestedAt));
	const finishedAt = schedule.generation?.finishedAt
		? moment.format(new Date(schedule.generation.finishedAt))
		: undefined;
	const requester = schedule.generationRequestedBy
		? (schedule.generationRequestedBy.displayName ?? t(`${key}.formerMember`))
		: undefined;
	return (
		<div
			className={joinClassNames(
				"flex flex-wrap items-start justify-between gap-6",
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
				{requestedAt && (
					<p className="mt-2 text-sm text-neutral-700">
						{requester
							? t(`${key}.requested`, { name: requester, at: requestedAt })
							: t(`${key}.requestedAt`, { at: requestedAt })}
						{finishedAt && (
							<>
								<span aria-hidden="true" className="mx-2">
									•
								</span>
								{t(`${key}.finished`, { at: finishedAt })}
							</>
						)}
					</p>
				)}
			</div>
			{actions}
		</div>
	);
};
