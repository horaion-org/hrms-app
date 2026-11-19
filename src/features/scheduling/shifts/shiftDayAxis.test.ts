import { describe, expect, it } from "vitest";
import {
	dayAxisOf,
	dayAxisTicksOf,
	dayBarOf,
	inDayOrder,
	type TimedShift,
} from "@/features/scheduling/shifts/shiftDayAxis";

/** A shift with only its times. */
const shift = (startTime: string, endTime: string): TimedShift => ({
	startTime,
	endTime,
});

describe("dayAxisOf", () => {
	it("given_dayAndOvernightShifts_when_measured_then_runsFromTheEarliestStartToTheLatestEndOnTheHour", () => {
		expect(
			dayAxisOf([shift("05:00", "13:00"), shift("20:00", "08:00")])
		).toEqual({ startMinute: 300, endMinute: 32 * 60 });
	});

	it("given_startsAndEndsOffTheHour_when_measured_then_widensToWholeHours", () => {
		expect(dayAxisOf([shift("06:30", "14:15")])).toEqual({
			startMinute: 360,
			endMinute: 15 * 60,
		});
	});

	it("given_noShifts_when_measured_then_aWholeDay", () => {
		expect(dayAxisOf([])).toEqual({ startMinute: 0, endMinute: 1440 });
	});
});

describe("dayBarOf", () => {
	const axis = { startMinute: 300, endMinute: 32 * 60 };

	it("given_aShift_when_placed_then_itsOffsetAndLengthAsShares", () => {
		const bar = dayBarOf(shift("08:00", "20:00"), axis);

		expect(bar.leftPercent).toBeCloseTo((3 / 27) * 100);
		expect(bar.widthPercent).toBeCloseTo((12 / 27) * 100);
	});

	it("given_anOvernightShift_when_placed_then_oneBarRunningPastMidnight", () => {
		const bar = dayBarOf(shift("20:00", "08:00"), axis);

		expect(bar.leftPercent + bar.widthPercent).toBeCloseTo(100);
	});
});

describe("dayAxisTicksOf", () => {
	it("given_anAxis_when_labelled_then_everyStepHoursWrappingPastMidnight", () => {
		expect(
			dayAxisTicksOf({ startMinute: 1200, endMinute: 32 * 60 }, 4).map(
				(tick) => tick.label
			)
		).toEqual(["20", "00", "04", "08"]);
	});
});

describe("inDayOrder", () => {
	it("given_shiftsOfSeveralGroups_when_ordered_then_groupsByTheirEarliestStartAndShiftsByStart", () => {
		const named = (
			name: string,
			group: string,
			startTime: string
		): TimedShift & { name: string; group: string } => ({
			name,
			group,
			startTime,
			endTime: "23:00",
		});

		expect(
			inDayOrder([
				named("Night 22", "Night", "22:00"),
				named("Late 15", "Late", "15:00"),
				named("Night 21", "Night", "21:00"),
				named("Early 05", "Early", "05:00"),
				named("Late 14", "Late", "14:00"),
			]).map((shift) => shift.name)
		).toEqual(["Early 05", "Late 14", "Late 15", "Night 21", "Night 22"]);
	});
});
