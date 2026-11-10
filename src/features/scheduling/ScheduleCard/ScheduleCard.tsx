import { useId } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SchedulingIcon } from "@/components/ui/Icon";
import { formatPeriod } from "@/features/scheduling/periods";
import type { ApprovalLine } from "@/features/approvals/approvalStanding";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleStatusTones } from "@/features/scheduling/schedules/scheduleStatusTones";
import { scheduleViewLink } from "@/features/scheduling/schedules/scheduleViewLink";
import { ScheduleSummary } from "@/features/scheduling/ScheduleCard/ScheduleSummary";

export type ScheduleCardProps = {
	schedule: Schedule;
	/** Where its approval stands, said as one line under the status; none without a flow. */
	approvalLine?: ApprovalLine;
	className?: string;
};

const key = "scheduling.overview";

/**
 * One department's schedule for a period: where it is filed, its status
 * (with how many setup issues its newest run found, and any approval line)
 * and what it includes.
 * View opens it by its status.
 */
export const ScheduleCard = ({
	schedule,
	approvalLine,
	className,
}: ScheduleCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = formattingLocale(i18n);
	const setupIssues = schedule.generation?.findings?.diagnostics.length ?? 0;

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
				<span className="flex flex-wrap items-center gap-2">
					{setupIssues > 0 && (
						<Badge tone="warning">
							{t("scheduling.findings.setupIssues", { count: setupIssues })}
						</Badge>
					)}
					<Badge tone={scheduleStatusTones[schedule.status]}>
						{t(`${key}.statuses.${schedule.status}`)}
					</Badge>
				</span>
			</div>
			{approvalLine && (
				<p
					className={joinClassNames(
						"mt-2 text-sm text-neutral-800",
						approvalLine.key === "approvals.meta.waitingOnYou" && "font-medium"
					)}
				>
					{t(approvalLine.key, approvalLine.values)}
				</p>
			)}
			<ScheduleSummary schedule={schedule} />
		</section>
	);
};
