import { describe, expect, it } from "vitest";
import {
	MINUTES_PER_DAY,
	minutesOfDay,
	timeOfDay,
	timeSteps,
	TIME_STEP_MINUTES,
} from "@/common/timeOfDay";

describe("timeOfDay", () => {
	it("given_aTime_when_counted_then_isMinutesSinceMidnight", () => {
		expect(minutesOfDay("00:00")).toBe(0);
		expect(minutesOfDay("09:30")).toBe(570);
		expect(minutesOfDay("23:30")).toBe(1410);
	});

	it("given_minutes_when_written_then_isHoursAndMinutesWrappingPastMidnight", () => {
		expect(timeOfDay(0)).toBe("00:00");
		expect(timeOfDay(570)).toBe("09:30");
		expect(timeOfDay(MINUTES_PER_DAY + 60)).toBe("01:00");
	});

	it("given_theDay_when_stepped_then_offersEveryHalfHourFromMidnight", () => {
		const steps = timeSteps();

		expect(steps).toHaveLength(MINUTES_PER_DAY / TIME_STEP_MINUTES);
		expect(steps.slice(0, 3)).toEqual(["00:00", "00:30", "01:00"]);
		expect(steps[steps.length - 1]).toBe("23:30");
		for (const step of steps) expect(timeOfDay(minutesOfDay(step))).toBe(step);
	});
});
