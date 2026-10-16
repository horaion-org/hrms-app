import { useId } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SchedulingIcon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPeriod } from "@/features/scheduling/periods";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { ScheduleSummary } from "@/features/scheduling/ScheduleCard/ScheduleSummary";
import {
	coverageTone,
	scheduleStatusTones,
	type ScheduleRecord,
} from "@/features/scheduling/schedules";

export type ScheduleCardProps = {
	schedule: ScheduleRecord;
	className?: string;
	details?: Schedule;
};

const key = "scheduling.overview";

/**
 * A department's current schedule: its period, status and how well it is
 * covered. While the schedule is still being generated the figures show as
 * placeholders.
 */
export const ScheduleCard = ({
	schedule,
	className,
	details,
}: ScheduleCardProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const titleId = useId();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const processing = schedule.status === "PROCESSING";
	const coverage = schedule.coverage ?? 0;
	const percent = new Intl.NumberFormat(language, {
		maximumFractionDigits: 1,
	}).format(coverage);

	return (
		<section
			aria-busy={processing || undefined}
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
					{schedule.code}
				</h2>
				{schedule.departmentId ? (
					<Button
						aria-label={t(`${key}.viewNamed`, { code: schedule.code })}
						to="/scheduling/new"
						variant="textlink"
						search={{
							step: "setup",
							scheduleId: schedule.scheduleId,
							departmentId: schedule.departmentId,
						}}
					>
						{t(`${key}.view`)}
					</Button>
				) : (
					<Button
						aria-label={t(`${key}.viewNamed`, { code: schedule.code })}
						params={{ scheduleId: schedule.scheduleId }}
						to="/scheduling/$scheduleId"
						variant="textlink"
					>
						{t(`${key}.view`)}
					</Button>
				)}
			</div>
			<p className="mt-2 text-sm text-neutral-700">
				{details
					? `${details.branchName} › ${details.departmentName}`
					: schedule.departmentName}
			</p>
			<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
				<span className="flex items-center gap-2 text-sm font-medium text-neutral-800">
					<SchedulingIcon aria-hidden="true" className="size-5" />
					{formatPeriod(schedule.period, language)}
				</span>
				<Badge tone={scheduleStatusTones[schedule.status]}>
					{t(`${key}.statuses.${schedule.status}`)}
				</Badge>
			</div>
			{details ? (
				<ScheduleSummary schedule={details} />
			) : (
				<>
					<h3 className="mt-8 font-semibold text-ink-blue-600">
						{t(`${key}.coverage`)}
					</h3>
					{processing ? (
						<>
							<Skeleton className="mt-3 h-12 w-32 rounded-lg" />
							<Skeleton className="mt-3 h-2.5 w-full" />
							<div className="mt-3 flex items-center gap-1">
								<Skeleton className="h-2.5 w-20" />
								<Skeleton className="h-2.5 w-20" />
							</div>
							<p className="sr-only">{t(`${key}.generating`)}</p>
						</>
					) : schedule.coverage === undefined ? (
						<p className="mt-3 text-sm text-neutral-700">
							{t(`${key}.metricsUnavailable`)}
						</p>
					) : (
						<>
							<p className="mt-2 text-4xl font-medium text-neutral-900">
								{t(`${key}.percent`, { value: percent })}
							</p>
							<ProgressBar
								className="mt-3"
								label={t(`${key}.coverage`)}
								tone={coverageTone(coverage)}
								value={coverage}
							/>
							<p className="mt-3 text-sm text-neutral-700">
								{t(`${key}.openShifts`, { count: schedule.openShifts ?? 0 })}
								<span aria-hidden="true" className="mx-1">
									•
								</span>
								{t(`${key}.conflicts`, { count: schedule.conflicts ?? 0 })}
							</p>
						</>
					)}
				</>
			)}
		</section>
	);
};
