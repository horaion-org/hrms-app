import i18n from "i18next";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import {
	formatTimes,
	percentOfTimes,
	timesOfPercent,
} from "@/features/employmentTerms/rates";

const t = i18n.getFixedT("en");

describe("rates", () => {
	it.each([
		[150, "1.5"],
		[200, "2"],
		[125, "1.25"],
		[0, "0"],
	])("given_%s_when_shownAsTimes_then_%s", (percent, times) => {
		expect(timesOfPercent(percent)).toBe(times);
		expect(percentOfTimes(times)).toBe(percent);
	});

	it("given_aCommaDecimal_when_read_then_theSameRate", () => {
		expect(percentOfTimes("1,5")).toBe(150);
	});

	it.each([["abc"], ["1.555"], ["1.5.2"], ["-1"]])(
		"given_%s_when_read_then_invalid",
		(text) => {
			expect(percentOfTimes(text)).toBe("invalid");
		}
	);

	it("given_nothingTyped_when_read_then_empty", () => {
		expect(percentOfTimes("  ")).toBe("empty");
	});

	// The range is the form's to judge, so a rate above 10 times still reads as its percentage.
	it("given_10Point01_when_read_then_1001", () => {
		expect(percentOfTimes("10.01")).toBe(1001);
	});

	it("given_150_when_worded_then_says1Point5Times", () => {
		expect(formatTimes(150, t)).toBe("1.5 times");
	});
});
