import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	dayWithoutShiftTileText,
	type RosterCell,
	shiftTimeText,
} from "@/features/scheduling/roster/roster";
import {
	rosterLooks,
	shiftTileStyle,
} from "@/features/scheduling/roster/rosterLooks";
import {
	scheduleOfDay,
	type TimelineSchedule,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";
import {
	shiftTextOfView,
	timelineColumns,
} from "@/features/scheduling/timeline/timelineLooks";
import type { TimelineRow } from "@/features/scheduling/timeline/timelineRows";

export type TimelineGridProps = {
	/** The ISO dates shown, one column each. */
	days: ReadonlyArray<string>;
	rows: ReadonlyArray<TimelineRow>;
	schedules: ReadonlyArray<TimelineSchedule>;
	view: TimelineView;
	/** The one schedule shown in full; cells of the others are dimmed. All in full when absent. */
	shownScheduleId?: string;
};

const tileClasses =
	"flex h-12 w-full min-w-0 items-center justify-center overflow-hidden rounded border px-1 text-center text-xs font-medium";

/** What a cell's tile says in this view: a shift by time and name, name or initial; any other day in its own words. */
const cellText = (
	cell: RosterCell,
	view: TimelineView,
	t: TFunction
): string => {
	if (cell.kind !== "shift") return dayWithoutShiftTileText(cell, t);
	const shown = shiftTextOfView[view];
	if (shown === "initial") return cell.name.charAt(0);
	if (shown === "name") return cell.name;
	return `${shiftTimeText(cell, t)} ${cell.name}`;
};

/** One person's day: their tile, an empty day, or "No schedule" where no schedule covers it. */
const DayCell = ({
	row,
	day,
	schedules,
	view,
	shownScheduleId,
}: Omit<TimelineGridProps, "days" | "rows"> & {
	row: TimelineRow;
	day: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	const owner = scheduleOfDay(schedules, day);
	if (!owner)
		return (
			<span
				className={joinClassNames(
					tileClasses,
					"border-dashed border-neutral-400 text-neutral-600"
				)}
			>
				{t("scheduling.timeline.grid.noSchedule")}
			</span>
		);
	const timelineCell = row.days[day];
	if (!timelineCell) return <span className={tileClasses} />;
	const { cell, scheduleId } = timelineCell;
	const toReview =
		schedules.find((schedule) => schedule.id === scheduleId)?.status ===
		"TO_REVIEW";
	const dimmed =
		shownScheduleId !== undefined && shownScheduleId !== scheduleId;
	return (
		<span
			data-schedule-id={scheduleId}
			style={cell.kind === "shift" ? shiftTileStyle(cell.colour) : undefined}
			title={cellText(cell, "week", t)}
			className={joinClassNames(
				tileClasses,
				cell.kind === "leave" && rosterLooks.leave,
				cell.kind !== "shift" && cell.kind !== "leave" && rosterLooks.off,
				toReview && "border-dashed",
				dimmed && "opacity-40"
			)}
		>
			<span className="truncate">{cellText(cell, view, t)}</span>
		</span>
	);
};

/** People by day across every schedule shown: a Staff column, then one column per day. */
export const TimelineGrid = ({
	days,
	rows,
	schedules,
	view,
	shownScheduleId,
}: TimelineGridProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const dayHeading = new Intl.DateTimeFormat(formattingLocale(i18n), {
		weekday: "short",
		day: "numeric",
	});
	const columns = { gridTemplateColumns: timelineColumns(days.length) };
	return (
		<div aria-label={t("scheduling.timeline.grid.label")} role="table">
			<div
				className="grid gap-1 border-b border-neutral-400 pb-1"
				role="row"
				style={columns}
			>
				<span
					className="text-sm font-semibold text-neutral-900"
					role="columnheader"
				>
					{t("scheduling.timeline.grid.staff")}
				</span>
				{days.map((day) => (
					<span
						key={day}
						className="truncate text-center text-xs font-semibold text-neutral-800"
						role="columnheader"
					>
						{dayHeading.format(dayjs(day).toDate())}
					</span>
				))}
			</div>
			{rows.length === 0 && (
				<p className="py-4 text-sm text-neutral-800">
					{t("scheduling.timeline.grid.noStaff")}
				</p>
			)}
			{rows.map((row) => (
				<div
					key={row.key}
					className="grid gap-1 py-1"
					role="row"
					style={columns}
				>
					<span
						className="min-w-0 truncate text-sm text-neutral-900"
						role="rowheader"
					>
						{row.name ?? t("scheduling.detail.formerMember")}
					</span>
					{days.map((day) => (
						<span key={day} className="min-w-0" role="cell">
							<DayCell
								day={day}
								row={row}
								schedules={schedules}
								shownScheduleId={shownScheduleId}
								view={view}
							/>
						</span>
					))}
				</div>
			))}
		</div>
	);
};
