import { describe, expect, it } from "vitest";
import { daysOf, mondayOf, openWeekOf, weeksOf } from "@/common/weeks";

describe("weeks", () => {
	it("given_anyDay_when_askedForItsMonday_then_goesBackToIt", () => {
		expect(mondayOf("2026-04-16")).toBe("2026-04-13");
		expect(mondayOf("2026-04-19")).toBe("2026-04-13");
		expect(mondayOf("2026-04-13")).toBe("2026-04-13");
	});

	it.each([
		{ name: "aWeekToComeStays", monday: "2026-11-23", open: "2026-11-23" },
		{ name: "thisWeekStays", monday: "2026-11-16", open: "2026-11-16" },
		{
			name: "anEndedWeekGivesThisOne",
			monday: "2026-11-02",
			open: "2026-11-16",
		},
	])("given_aWeek_when_itsOpenWeekIsAsked_then_$name", ({ monday, open }) => {
		expect(openWeekOf(monday, "2026-11-18")).toBe(open);
	});

	it("given_aFortnight_when_split_then_givesTwoWeeksOfSevenDays", () => {
		const weeks = weeksOf({ start: "2026-04-13", end: "2026-04-26" });

		expect(weeks).toEqual([
			{ start: "2026-04-13", end: "2026-04-19" },
			{ start: "2026-04-20", end: "2026-04-26" },
		]);
		expect(daysOf("2026-04-13")).toHaveLength(7);
		expect(daysOf("2026-04-13")[6]).toBe("2026-04-19");
	});
});
