import { describe, expect, it } from "vitest";
import { dateTimeFormatIn } from "@/common/dateTimeFormatIn";

const instant = new Date("2026-11-09T23:30:00Z");
const dayAndHour: Intl.DateTimeFormatOptions = {
	day: "2-digit",
	hour: "2-digit",
	hourCycle: "h23",
};

describe("dateTimeFormatIn", () => {
	it.each([
		["UTC", "09, 23"],
		["Asia/Singapore", "10, 07"],
		["America/New_York", "09, 18"],
	])("writes the instant in %s as %s", (timeZone, written) => {
		expect(
			dateTimeFormatIn("en-GB", timeZone, dayAndHour).format(instant)
		).toBe(written);
	});

	it("falls back to the browser's zone for a zone name it does not know", () => {
		const browserZone = new Intl.DateTimeFormat("en-GB", dayAndHour);

		expect(
			dateTimeFormatIn("en-GB", "Not/AZone", dayAndHour).format(instant)
		).toBe(browserZone.format(instant));
	});
});
