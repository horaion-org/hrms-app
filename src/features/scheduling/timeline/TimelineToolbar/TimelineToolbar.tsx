import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/Icon";
import {
	DAYS_IN_VIEW,
	type TimelineSchedule,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";

/** The value of the schedule select that shows every schedule. */
const ALL_SCHEDULES = "";

const VIEWS = Object.keys(DAYS_IN_VIEW) as Array<TimelineView>;

export type TimelineToolbarProps = {
	view: TimelineView;
	schedules: ReadonlyArray<TimelineSchedule>;
	/** The schedule shown alone, or undefined for all. */
	shownScheduleId?: string;
	onToday: () => void;
	/** Moves the window one view's length earlier (-1) or later (1). */
	onStep: (step: 1 | -1) => void;
	onViewChange: (view: TimelineView) => void;
	/** Shows one schedule alone, or every schedule with undefined. */
	onScheduleChange: (scheduleId: string | undefined) => void;
};

/** Today, earlier and later days, the schedule select and the zoom, styled as the week navigator. */
export const TimelineToolbar = ({
	view,
	schedules,
	shownScheduleId,
	onToday,
	onStep,
	onViewChange,
	onScheduleChange,
}: TimelineToolbarProps): FunctionComponent => {
	const { t } = useTranslation();
	const key = "scheduling.timeline.toolbar";
	return (
		<div
			aria-label={t(`${key}.label`)}
			className="flex flex-wrap items-center gap-3"
			role="group"
		>
			<Button size="sm" variant="secondary" onClick={onToday}>
				{t(`${key}.today`)}
			</Button>
			<Button
				aria-label={t(`${key}.previous`)}
				className="size-12! rounded-full! border border-neutral-500"
				variant="icon"
				onClick={() => {
					onStep(-1);
				}}
			>
				<ChevronLeftIcon />
			</Button>
			<Button
				aria-label={t(`${key}.next`)}
				className="size-12! rounded-full! border border-neutral-500"
				variant="icon"
				onClick={() => {
					onStep(1);
				}}
			>
				<ChevronRightIcon />
			</Button>
			<Select
				aria-label={t(`${key}.schedule`)}
				className="w-56"
				value={shownScheduleId ?? ALL_SCHEDULES}
				options={[
					{ value: ALL_SCHEDULES, label: t(`${key}.allSchedules`) },
					...schedules.map((schedule) => ({
						value: schedule.id,
						label: schedule.name,
					})),
				]}
				onChange={(value) => {
					onScheduleChange(value === ALL_SCHEDULES ? undefined : value);
				}}
			/>
			<div aria-label={t(`${key}.zoom`)} className="flex gap-1" role="group">
				{VIEWS.map((option) => (
					<Button
						key={option}
						aria-pressed={option === view}
						size="sm"
						variant={option === view ? "primary" : "secondary"}
						onClick={() => {
							onViewChange(option);
						}}
					>
						{t(`${key}.views.${option}`)}
					</Button>
				))}
			</div>
		</div>
	);
};
