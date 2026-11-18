import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Avatar } from "@/components/ui/Avatar";
import {
	dayWithoutShiftPlainText,
	type RosterCell,
	shiftTimeText,
} from "@/features/scheduling/roster/roster";
import {
	rosterLooks,
	shiftTileStyle,
} from "@/features/scheduling/roster/rosterLooks";
import { ScheduleBars } from "@/features/scheduling/timeline/ScheduleBars";
import {
	isDimmed,
	scheduleOfDay,
	type TimelineSchedule,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";
import {
	cellLinesOf,
	LABEL_DAY_FORMAT,
	staffCellClasses,
	staffColumnClasses,
	tableMinWidthOf,
	ZOOM_LOOKS,
} from "@/features/scheduling/timeline/timelineLooks";
import {
	hoursOfRow,
	type RostersRead,
	type TimelineRow,
} from "@/features/scheduling/timeline/timelineRows";

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
	/** Whether every roster is read; while loading or after a failure the grid says so rather than "No one is rostered". */
	rosters: RostersRead;
};

const key = "scheduling.timeline.grid";

// `relative`, as the roster grid's tiles: each tile's screen-reader label (`sr-only`, absolutely positioned) is
// placed in its tile. Without it the label's box is placed against the app shell, outside the scrolling
// container, and a label far right in the table widens the whole page on a phone.
const tileClasses =
	"relative flex min-h-12 w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded border px-1 py-1 text-center text-xs leading-4 font-medium whitespace-nowrap";

/** A day's full words, as its label names it: a shift with its time, any other day in plain words. */
const dayWords = (cell: RosterCell, t: TFunction): string =>
	cell.kind === "shift"
		? `${cell.name} ${shiftTimeText(cell, t)}`
		: dayWithoutShiftPlainText(cell, t);

/**
 * One person's day: their tile, an empty day of a schedule, or the empty-day
 * mark where no schedule covers it. Its full words are its `title` and label.
 */
const DayCell = ({
	row,
	name,
	day,
	dayName,
	schedules,
	view,
	shownScheduleId,
}: Pick<TimelineGridProps, "schedules" | "view" | "shownScheduleId"> & {
	row: TimelineRow;
	name: string;
	day: string;
	dayName: string;
}): FunctionComponent => {
	const { t } = useTranslation();
	const timelineCell = row.days[day];
	const owner = timelineCell
		? schedules.find((schedule) => schedule.id === timelineCell.scheduleId)
		: scheduleOfDay(schedules, day);
	if (!owner) {
		const label = t(`${key}.noScheduleLabel`, { name, day: dayName });
		return (
			<span
				title={label}
				className={joinClassNames(
					tileClasses,
					"border-dashed border-neutral-400 text-neutral-600"
				)}
			>
				<span aria-hidden="true">
					{t(`${key}.emptyDay.${ZOOM_LOOKS[view].emptyDay}`)}
				</span>
				<span className="sr-only">{label}</span>
			</span>
		);
	}
	const state = t(`scheduling.months.states.${owner.status}`);
	const dimmed = isDimmed(owner.id, shownScheduleId);
	if (!timelineCell) {
		const label = t(`${key}.notRosteredLabel`, {
			name,
			day: dayName,
			schedule: owner.name,
			state,
		});
		return (
			<span
				className={joinClassNames(tileClasses, dimmed && "opacity-40")}
				title={label}
			>
				<span className="sr-only">{label}</span>
			</span>
		);
	}
	const { cell } = timelineCell;
	const label = t(`${key}.cellLabel`, {
		name,
		day: dayName,
		what: dayWords(cell, t),
		schedule: owner.name,
		state,
	});
	return (
		<span
			data-schedule-id={owner.id}
			style={cell.kind === "shift" ? shiftTileStyle(cell.colour) : undefined}
			title={label}
			className={joinClassNames(
				tileClasses,
				cell.kind === "leave" && rosterLooks.leave,
				cell.kind !== "shift" && cell.kind !== "leave" && rosterLooks.off,
				owner.status === "TO_REVIEW" && "border-dashed",
				dimmed && "opacity-40"
			)}
		>
			{cellLinesOf(cell, view, t).map((line) => (
				<span
					key={line.text}
					aria-hidden="true"
					className={
						line.isTime
							? "block max-w-full font-semibold text-balance whitespace-normal tabular-nums"
							: "max-w-full truncate"
					}
				>
					{line.text}
				</span>
			))}
			<span className="sr-only">{label}</span>
		</span>
	);
};

/** A person's Staff cell, as the roster grid's: avatar, name, job title and hours in the window; name and job title alone in four weeks. */
const StaffCell = ({
	row,
	name,
	days,
	view,
}: {
	row: TimelineRow;
	name: string;
	days: ReadonlyArray<string>;
	view: TimelineView;
}): FunctionComponent => {
	const { t } = useTranslation();
	const showsDetails = ZOOM_LOOKS[view].staffDetails;
	return (
		<th className={joinClassNames(staffCellClasses, "font-normal")} scope="row">
			<span className="flex items-center gap-3">
				{showsDetails && (
					<Avatar className="size-10! text-base! max-sm:hidden" name={name} />
				)}
				<span className="min-w-0">
					<span className="block truncate text-xs font-semibold">{name}</span>
					<span className="mt-0.5 block truncate text-[0.625rem]">
						{row.jobTitle ?? row.employeeCode}
					</span>
					{showsDetails && (
						<span className="block text-[0.625rem]">
							{t("scheduling.detail.hours", { count: hoursOfRow(row, days) })}
						</span>
					)}
				</span>
			</span>
		</th>
	);
};

/** A row across the table saying why it has no staff rows yet; an alert when a read failed. */
const StatusRow = ({
	days,
	alert,
	children,
}: {
	days: ReadonlyArray<string>;
	alert: boolean;
	children: string;
}): FunctionComponent => (
	<tr className="border-t border-neutral-400">
		<td
			className="px-3 py-4 text-sm text-neutral-800"
			colSpan={days.length + 1}
			role={alert ? "alert" : undefined}
		>
			{children}
		</td>
	</tr>
);

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
	rosters,
}: TimelineGridProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const { dayHeader } = ZOOM_LOOKS[view];
	const weekday = new Intl.DateTimeFormat(language, {
		weekday: dayHeader.weekday,
	});
	const date = new Intl.DateTimeFormat(language, dayHeader.date);
	const dayName = new Intl.DateTimeFormat(language, LABEL_DAY_FORMAT);
	/** A day as labels name it. */
	const dayNameOf = (day: string): string =>
		dayName.format(dayjs(day).toDate());
	return (
		<div className="min-w-0 overflow-x-auto rounded-lg border border-neutral-400">
			<table
				style={{ minWidth: tableMinWidthOf(view, days.length) }}
				className={joinClassNames(
					"w-full table-fixed border-collapse text-neutral-900",
					staffColumnClasses
				)}
			>
				<caption className="sr-only">{t(`${key}.label`)}</caption>
				<colgroup>
					<col className="w-(--staff-column)" />
				</colgroup>
				<thead>
					<tr className="bg-neutral-200">
						{/* The Staff column stays in view while the days scroll, as in the roster grid. */}
						<th
							className="sticky left-0 z-10 h-12 bg-neutral-200 px-3 text-left text-sm font-bold"
							scope="col"
						>
							{t(`${key}.staff`)}
						</th>
						{days.map((day) => (
							<th
								key={day}
								className="h-12 px-1 text-center whitespace-nowrap"
								scope="col"
								title={dayNameOf(day)}
							>
								<span className="block text-sm font-bold">
									{weekday.format(dayjs(day).toDate())}
								</span>
								<span className="block text-xs font-normal">
									{date.format(dayjs(day).toDate())}
								</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					<ScheduleBars
						days={days}
						schedules={schedules}
						shownScheduleId={shownScheduleId}
						view={view}
						onShowOnly={onShowOnly}
					/>
					{rosters === "failed" && (
						<StatusRow alert days={days}>
							{t(`${key}.rostersFailed`)}
						</StatusRow>
					)}
					{rosters === "loading" && (
						<StatusRow alert={false} days={days}>
							{t(`${key}.rostersLoading`)}
						</StatusRow>
					)}
					{rosters === "loaded" && rows.length === 0 && (
						<StatusRow alert={false} days={days}>
							{t(`${key}.noStaff`)}
						</StatusRow>
					)}
					{rows.map((row) => {
						const name = row.name ?? t("scheduling.detail.formerMember");
						return (
							<tr key={row.key} className="border-t border-neutral-400">
								<StaffCell days={days} name={name} row={row} view={view} />
								{days.map((day) => (
									<td key={day} className="p-1">
										<DayCell
											day={day}
											dayName={dayNameOf(day)}
											name={name}
											row={row}
											schedules={schedules}
											shownScheduleId={shownScheduleId}
											view={view}
										/>
									</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
