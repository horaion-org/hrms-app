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
import { ScheduleBars } from "@/features/scheduling/timeline/ScheduleBars";
import {
	scheduleOfDay,
	type TimelineSchedule,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";
import {
	shiftTextOfView,
	staffCellClasses,
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
	/** "Show only this schedule" was chosen on a bar. */
	onShowOnly: (scheduleId: string) => void;
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
}: Pick<TimelineGridProps, "schedules" | "view" | "shownScheduleId"> & {
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

/**
 * The timeline as one table, in the roster grid's bordered container: a header
 * row of days, the schedules' bar lanes, then one row per person.
 */
export const TimelineGrid = ({
	days,
	rows,
	schedules,
	view,
	shownScheduleId,
	onShowOnly,
}: TimelineGridProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const dayHeading = new Intl.DateTimeFormat(formattingLocale(i18n), {
		weekday: "short",
		day: "numeric",
	});
	return (
		<div className="min-w-0 overflow-x-auto rounded-lg border border-neutral-400">
			<table className="w-full table-fixed border-collapse text-neutral-900">
				<caption className="sr-only">
					{t("scheduling.timeline.grid.label")}
				</caption>
				<colgroup>
					<col className="w-28 sm:w-50" />
				</colgroup>
				<thead>
					<tr className="bg-neutral-200">
						<th
							className="h-12 bg-neutral-200 px-3 text-left text-sm font-bold"
							scope="col"
						>
							{t("scheduling.timeline.grid.staff")}
						</th>
						{days.map((day) => (
							<th
								key={day}
								className="h-12 truncate px-1 text-center text-xs font-bold"
								scope="col"
							>
								{dayHeading.format(dayjs(day).toDate())}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					<ScheduleBars
						days={days}
						schedules={schedules}
						onShowOnly={onShowOnly}
					/>
					{rows.length === 0 && (
						<tr className="border-t border-neutral-400">
							<td
								className="px-3 py-4 text-sm text-neutral-800"
								colSpan={days.length + 1}
							>
								{t("scheduling.timeline.grid.noStaff")}
							</td>
						</tr>
					)}
					{rows.map((row) => (
						<tr key={row.key} className="border-t border-neutral-400">
							<th
								scope="row"
								className={joinClassNames(
									staffCellClasses,
									"truncate text-sm font-normal"
								)}
							>
								{row.name ?? t("scheduling.detail.formerMember")}
							</th>
							{days.map((day) => (
								<td key={day} className="p-1">
									<DayCell
										day={day}
										row={row}
										schedules={schedules}
										shownScheduleId={shownScheduleId}
										view={view}
									/>
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
