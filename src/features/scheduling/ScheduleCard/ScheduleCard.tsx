import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SchedulingIcon } from "@/components/ui/Icon";
import { formatPeriod } from "@/features/scheduling/periods";
import { scheduleStatusTones } from "@/features/scheduling/schedules";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleViewLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { ScheduleSummary } from "@/features/scheduling/ScheduleCard/ScheduleSummary";

export type ScheduleCardProps = {
	schedule: Schedule;
	className?: string;
};

const key = "scheduling.overview";

/**
 * One department's schedule for a period: where it is filed, its status and
 * what it includes. View opens it by its status.
 */
export const ScheduleCard = ({
	schedule,
	className,
}: ScheduleCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = i18n.resolvedLanguage ?? i18n.language;

	return (
		<section
			aria-labelledby={titleId}
			className={joinClassNames(
				"flex min-w-0 flex-col rounded-xl border border-neutral-400 bg-neutral-100 p-6",
				className
			)}
		>
			<div className="flex items-center justify-between gap-4">
				<h2
					className="truncate text-xl font-bold text-neutral-900"
					id={titleId}
				>
					{schedule.name}
				</h2>
				<Button
					{...scheduleViewLink(schedule)}
					aria-label={t(`${key}.viewNamed`, { code: schedule.name })}
					variant="textlink"
				>
					{t(`${key}.view`)}
				</Button>
			</div>
			<p className="mt-2 text-sm text-neutral-700">
				{`${schedule.branchName} › ${schedule.departmentName}`}
			</p>
			<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
				<span className="flex items-center gap-2 text-sm font-medium text-neutral-800">
					<SchedulingIcon aria-hidden="true" className="size-5" />
					{formatPeriod(
						{ start: schedule.periodStart, end: schedule.periodEnd },
						language
					)}
				</span>
				<Badge tone={scheduleStatusTones[schedule.status]}>
					{t(`${key}.statuses.${schedule.status}`)}
				</Badge>
			</div>
			<ScheduleSummary schedule={schedule} />
		</section>
	);
};
