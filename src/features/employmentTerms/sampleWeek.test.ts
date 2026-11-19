import { describe, expect, it } from "vitest";
import { sampleWeek } from "@/features/employmentTerms/sampleWeek";

const kinds = (week: ReturnType<typeof sampleWeek>): Array<string> =>
	week.days.map((day) => day.kind);

describe("sampleWeek", () => {
	it("given_5DaysSundayRest_when_drawn_then_fiveNormalOneOffOneRest", () => {
		const week = sampleWeek({
			daysPerWeek: 5,
			weekMinutes: 2640,
			dayMinutes: 528,
			restDay: "SUN",
			partTime: false,
		});
		expect(kinds(week)).toEqual([
			"NORMAL",
			"NORMAL",
			"NORMAL",
			"NORMAL",
			"NORMAL",
			"OFF",
			"REST",
		]);
		expect(week.days[0]?.minutes).toBe(528);
		expect(week.restIsExample).toBe(false);
	});

	it("given_5AndAHalfDays_when_drawn_then_aHalfDayOnSaturday", () => {
		const week = sampleWeek({
			daysPerWeek: 5.5,
			weekMinutes: 2640,
			dayMinutes: 480,
			restDay: "SUN",
			partTime: false,
		});
		expect(week.days[5]).toEqual({
			weekday: "SAT",
			kind: "HALF",
			minutes: 240,
		});
	});

	it("given_rosterPicks_when_drawn_then_restMarkedAsAnExample", () => {
		const week = sampleWeek({
			daysPerWeek: 6,
			weekMinutes: 2640,
			dayMinutes: 440,
			restDay: "ROSTERED",
			partTime: false,
		});
		expect(kinds(week)).toEqual([
			"NORMAL",
			"NORMAL",
			"NORMAL",
			"NORMAL",
			"NORMAL",
			"NORMAL",
			"REST",
		]);
		expect(week.restIsExample).toBe(true);
	});

	it("given_partTimeDaysVary_when_drawn_then_everyDayVaries", () => {
		const week = sampleWeek({
			daysPerWeek: null,
			weekMinutes: 1200,
			dayMinutes: null,
			restDay: "ROSTERED",
			partTime: true,
		});
		expect(new Set(kinds(week))).toEqual(new Set(["VARIES"]));
		expect(week.days[0]?.minutes).toBe(171);
	});

	it("given_partTimeOnFixedDays_when_drawn_then_noRestDay", () => {
		const week = sampleWeek({
			daysPerWeek: 4,
			weekMinutes: 1200,
			dayMinutes: 300,
			restDay: "SUN",
			partTime: true,
		});
		expect(kinds(week)).not.toContain("REST");
	});
});
