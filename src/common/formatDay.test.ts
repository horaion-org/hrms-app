import { describe, expect, it } from "vitest";
import { formatDay } from "@/common/formatDay";

describe("formatDay", () => {
	it("given_anIsoDate_when_formatted_then_readsAsAShortWeekdayDayAndMonth", () => {
		expect(formatDay("2026-10-12", "en-GB")).toBe("Mon 12 Oct");
		expect(formatDay("2026-10-12", "en-US")).toBe("Mon, Oct 12");
	});

	it("given_aTimestamp_when_formatted_then_readsAsItsDay", () => {
		expect(formatDay("2026-10-12T09:30:00", "en-GB")).toBe("Mon 12 Oct");
	});
});
