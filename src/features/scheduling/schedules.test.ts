import { describe, expect, it } from "vitest";
import {
	coverageTone,
	daysOf,
	exampleScheduleDetail,
	exampleSchedules,
	mondayOf,
	weeksOf,
} from "@/features/scheduling/schedules";

describe("schedule dates", () => {
	it("given_anyDay_when_askedForItsMonday_then_goesBackToIt", () => {
		expect(mondayOf("2026-04-16")).toBe("2026-04-13");
		expect(mondayOf("2026-04-19")).toBe("2026-04-13");
		expect(mondayOf("2026-04-13")).toBe("2026-04-13");
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

describe("coverageTone", () => {
	it("given_coverage_when_toned_then_greenAmberOrRed", () => {
		expect(coverageTone(98.2)).toBe("success");
		expect(coverageTone(88.3)).toBe("warning");
		expect(coverageTone(84.7)).toBe("error");
	});
});

describe("example schedules", () => {
	it("given_today_when_built_then_currentOnesStartThisMonday", () => {
		const { current, history } = exampleSchedules(
			new Date("2026-10-14T10:00:00")
		);

		expect(current).toHaveLength(5);
		expect(current[0]?.code).toBe("FO-261012");
		expect(current[0]?.period).toEqual({
			start: "2026-10-12",
			end: "2026-10-25",
		});
		expect(history.every((item) => item.period.start < "2026-10-12")).toBe(
			true
		);
	});

	it("given_aKnownId_when_detailed_then_listsItsDepartmentFirst", () => {
		const today = new Date("2026-10-14T10:00:00");
		const detail = exampleScheduleDetail("fo-261012", today);

		expect(detail?.groups[0]?.name).toBe("Front Office");
		expect(detail?.groups[0]?.staff.length).toBeGreaterThan(0);
		expect(exampleScheduleDetail("unknown", today)).toBeUndefined();
	});
});
