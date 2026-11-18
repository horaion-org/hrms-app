import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { OverflowMenu, OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { weekStateTones } from "@/features/scheduling/months/weekStateLooks";
import {
	lanesOf,
	type TimelineSchedule,
} from "@/features/scheduling/timeline/timeline";
import {
	statusDotLooks,
	timelineColumns,
} from "@/features/scheduling/timeline/timelineLooks";

/** A bar this many days wide or wider has room for its status badge. */
const DAYS_FOR_BADGE = 3;

export type ScheduleBarsProps = {
	schedules: ReadonlyArray<TimelineSchedule>;
	/** The ISO dates shown, one column each. */
	days: ReadonlyArray<string>;
	/** "Show only this schedule" was chosen. */
	onShowOnly: (scheduleId: string) => void;
};

/** The grid columns a schedule's bar spans within the days shown, clipped to them. */
const columnsOf = (
	schedule: TimelineSchedule,
	days: ReadonlyArray<string>
): { start: number; span: number } => {
	const first = Math.max(days.indexOf(schedule.firstDay), 0);
	const lastIndex = days.indexOf(schedule.lastDay);
	const last = lastIndex === -1 ? days.length - 1 : lastIndex;
	// Column 1 is the Staff column, so the first day is column 2.
	return { start: first + 2, span: last - first + 1 };
};

/** One schedule's bar: its status dot, name and, when wide enough, its status badge; opens its menu. */
const ScheduleBar = ({
	schedule,
	span,
	onShowOnly,
}: {
	schedule: TimelineSchedule;
	span: number;
	onShowOnly: (scheduleId: string) => void;
}): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const state = t(`scheduling.months.states.${schedule.status}`);
	return (
		<OverflowMenu
			label={
				<span
					className="flex min-w-0 items-center gap-2"
					aria-label={t("scheduling.timeline.bars.bar", {
						name: schedule.name,
						state,
					})}
				>
					<span
						aria-hidden="true"
						className={joinClassNames(
							"size-2 shrink-0 rounded-full",
							statusDotLooks[weekStateTones[schedule.status]]
						)}
					/>
					<span className="truncate text-sm font-semibold text-neutral-900">
						{schedule.name}
					</span>
					{span >= DAYS_FOR_BADGE && (
						<Badge compact tone={weekStateTones[schedule.status]}>
							{state}
						</Badge>
					)}
				</span>
			}
		>
			<OverflowMenuItem
				onClick={() => {
					void navigate({
						to: "/scheduling/$scheduleId",
						params: { scheduleId: schedule.id },
					});
				}}
			>
				{t("scheduling.timeline.bars.openSchedule")}
			</OverflowMenuItem>
			<OverflowMenuItem
				onClick={() => {
					onShowOnly(schedule.id);
				}}
			>
				{t("scheduling.timeline.bars.showOnly")}
			</OverflowMenuItem>
		</OverflowMenu>
	);
};

/** The schedules over the day columns, packed into lanes so schedules that don't overlap share one. */
export const ScheduleBars = ({
	schedules,
	days,
	onShowOnly,
}: ScheduleBarsProps): FunctionComponent => {
	const { t } = useTranslation();
	const lanes = lanesOf(schedules, days[0] ?? "", days[days.length - 1] ?? "");
	return (
		<div
			aria-label={t("scheduling.timeline.bars.label")}
			className="flex flex-col gap-1"
			role="group"
		>
			{lanes.map((lane) => (
				<div
					key={lane[0]!.id}
					className="grid gap-1"
					style={{ gridTemplateColumns: timelineColumns(days.length) }}
				>
					{lane.map((schedule) => {
						const { start, span } = columnsOf(schedule, days);
						return (
							<div
								key={schedule.id}
								style={{ gridColumn: `${start} / span ${span}` }}
							>
								<ScheduleBar
									schedule={schedule}
									span={span}
									onShowOnly={onShowOnly}
								/>
							</div>
						);
					})}
				</div>
			))}
		</div>
	);
};
