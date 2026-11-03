import { describe, expect, it } from "vitest";
import { isWeekday, WEEKDAYS } from "@/common/weekdays";

describe("weekdays", () => {
	it("given_theWeek_when_listed_then_startsOnMonday", () => {
		expect(WEEKDAYS).toEqual(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
	});

	it("given_aValue_when_checked_then_acceptsOnlyTheApisNames", () => {
		expect(isWeekday("SUN")).toBe(true);
		expect(isWeekday("sun")).toBe(false);
		expect(isWeekday("Sunday")).toBe(false);
		expect(isWeekday("")).toBe(false);
	});
});
