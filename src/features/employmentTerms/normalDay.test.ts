import { describe, expect, it } from "vitest";
import { normalDayMinutes } from "@/features/employmentTerms/normalDay";

// The same table as the API's NormalDayTest.
describe("normalDayMinutes", () => {
	it.each<[number | null, number, number | null]>([
		[5, 2640, 528],
		[5.5, 2640, 480],
		[6, 2640, 440],
		[null, 2640, null],
		[7, 61, 8],
	])("given_%s days and %s minutes_when_worked out_then_%s", (days, week, day) => {
		expect(normalDayMinutes(days, week)).toBe(day);
	});
});
