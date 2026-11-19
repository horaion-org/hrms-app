import {
	MINUTES_PER_DAY,
	MINUTES_PER_HOUR,
	minutesOfDay,
} from "@/common/timeOfDay";
import { shiftMinutes } from "@/features/scheduling/shifts/shiftHours";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

/** What the day axis reads of a shift. */
export type TimedShift = Pick<ScheduleShift, "startTime" | "endTime">;

/** One axis every shift's bar shares: minutes from midnight of the first day, the end past midnight when a shift runs over. */
export type DayAxis = { startMinute: number; endMinute: number };

/** Where a bar sits on the axis, as percentages of its width. */
export type DayBar = { leftPercent: number; widthPercent: number };

/** One labelled hour on the axis, as "05", and where it sits. */
export type DayAxisTick = { label: string; percent: number };

/** A whole day, the axis of a department with no shifts. */
const WHOLE_DAY: DayAxis = { startMinute: 0, endMinute: MINUTES_PER_DAY };

/** When a shift starts and ends, in minutes from midnight of its first day. */
const spanOf = (shift: TimedShift): DayAxis => {
	const startMinute = minutesOfDay(shift.startTime);
	return { startMinute, endMinute: startMinute + shiftMinutes(shift) };
};

/**
 * The axis from the earliest start, on the hour, to the latest end, on the
 * hour, so an overnight shift stays one bar running past midnight.
 */
export const dayAxisOf = (shifts: ReadonlyArray<TimedShift>): DayAxis => {
	if (shifts.length === 0) return WHOLE_DAY;
	const spans = shifts.map(spanOf);
	const earliest = Math.min(...spans.map((span) => span.startMinute));
	const startMinute =
		Math.floor(earliest / MINUTES_PER_HOUR) * MINUTES_PER_HOUR;
	const latest = Math.max(...spans.map((span) => span.endMinute));
	const endMinute = Math.ceil(latest / MINUTES_PER_HOUR) * MINUTES_PER_HOUR;
	return { startMinute, endMinute };
};

/** Where a shift's bar sits on the axis. */
export const dayBarOf = (shift: TimedShift, axis: DayAxis): DayBar => {
	const span = spanOf(shift);
	const length = axis.endMinute - axis.startMinute;
	return {
		leftPercent: ((span.startMinute - axis.startMinute) / length) * 100,
		widthPercent: ((span.endMinute - span.startMinute) / length) * 100,
	};
};

/** The hours labelled along the axis, every `stepHours` from its start. */
export const dayAxisTicksOf = (
	axis: DayAxis,
	stepHours: number
): Array<DayAxisTick> => {
	const length = axis.endMinute - axis.startMinute;
	const step = stepHours * MINUTES_PER_HOUR;
	const ticks: Array<DayAxisTick> = [];
	for (
		let minute = axis.startMinute;
		minute <= axis.endMinute;
		minute += step
	) {
		const hour = (minute / MINUTES_PER_HOUR) % 24;
		ticks.push({
			label: String(hour).padStart(2, "0"),
			percent: ((minute - axis.startMinute) / length) * 100,
		});
	}
	return ticks;
};

/**
 * Shifts as the day runs: their groups by each group's earliest start, then
 * the shifts of a group by start, then by name.
 */
export const inDayOrder = <
	Shift extends TimedShift & { group: string; name: string },
>(
	shifts: ReadonlyArray<Shift>
): Array<Shift> => {
	const startOf = (shift: Shift): number => minutesOfDay(shift.startTime);
	const groupStart = new Map<string, number>();
	for (const shift of shifts)
		groupStart.set(
			shift.group,
			Math.min(groupStart.get(shift.group) ?? Infinity, startOf(shift))
		);
	return [...shifts].sort(
		(a, b) =>
			(groupStart.get(a.group) ?? 0) - (groupStart.get(b.group) ?? 0) ||
			a.group.localeCompare(b.group) ||
			startOf(a) - startOf(b) ||
			a.name.localeCompare(b.name)
	);
};
