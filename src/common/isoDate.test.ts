import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { ISO_DATE_FORMAT } from "@/common/isoDate";

describe("ISO_DATE_FORMAT", () => {
	it("given_aLocalDateTime_when_formatted_then_itsDayAsYearMonthDayWithLeadingZeros", () => {
		expect(dayjs(new Date(2026, 0, 5, 23, 59)).format(ISO_DATE_FORMAT)).toBe(
			"2026-01-05"
		);
	});

	it("given_anIsoDay_when_formattedAgain_then_unchanged", () => {
		expect(dayjs("2026-11-18").format(ISO_DATE_FORMAT)).toBe("2026-11-18");
	});
});
