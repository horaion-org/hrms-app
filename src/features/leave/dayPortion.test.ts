import i18n from "i18next";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import {
	amountText,
	CUSTOM_VALUE,
	dayPortionBody,
	dayPortionChoiceOf,
	dayPortionOptions,
	FULL_DAY_VALUE,
	portionText,
	timeRangeText,
} from "@/features/leave/dayPortion";
import { LEAVE_DURATION_OPTION_FIXTURES } from "@/features/leave/fixtures";

const t = i18n.getFixedT("en");
const CUSTOM_TIMES = { start: "10:00", end: "12:30" };

describe("dayPortionOptions", () => {
	it("offers the full day first, each duration with its time and length, then Custom", () => {
		expect(dayPortionOptions(LEAVE_DURATION_OPTION_FIXTURES, t)).toEqual([
			{ value: FULL_DAY_VALUE, label: "Full day" },
			{ value: "ld-morning", label: "Morning · 09:00–13:00 · 4 h" },
			{ value: "ld-night", label: "Night · 22:00–02:00 next day · 4 h" },
			{ value: CUSTOM_VALUE, label: "Custom" },
		]);
	});

	it("offers the full day and Custom when no duration applies", () => {
		expect(dayPortionOptions([], t).map((option) => option.value)).toEqual([
			FULL_DAY_VALUE,
			CUSTOM_VALUE,
		]);
	});
});

describe("dayPortionBody", () => {
	it("sends nothing for the full day", () => {
		expect(
			dayPortionBody(dayPortionChoiceOf(FULL_DAY_VALUE), CUSTOM_TIMES)
		).toEqual({});
	});

	it("sends a duration's id alone", () => {
		expect(
			dayPortionBody(dayPortionChoiceOf("ld-morning"), CUSTOM_TIMES)
		).toEqual({ leaveDurationId: "ld-morning" });
	});

	it("sends Custom's two times", () => {
		expect(
			dayPortionBody(dayPortionChoiceOf(CUSTOM_VALUE), CUSTOM_TIMES)
		).toEqual({ startTime: "10:00", endTime: "12:30" });
	});
});

describe("amountText", () => {
	it.each([
		[{ workingDays: 1, leaveMinutes: 240 }, "4 h"],
		[{ workingDays: 1, leaveMinutes: 150 }, "2 h 30 min"],
		[{ workingDays: 3, leaveMinutes: null }, "3 days"],
		[{ workingDays: 1, leaveMinutes: null }, "1 day"],
	])("words %o as %s", (request, text) => {
		expect(amountText(request, t)).toBe(text);
	});
});

describe("portionText", () => {
	it("names a duration with its times", () => {
		expect(
			portionText(
				{ durationName: "Morning", startTime: "09:00", endTime: "13:00" },
				t
			)
		).toBe("Morning 09:00–13:00");
	});

	it("reads times without a name as Custom", () => {
		expect(
			portionText(
				{ durationName: null, startTime: "10:00", endTime: "12:00" },
				t
			)
		).toBe("Custom 10:00–12:00");
	});

	it("says nothing for whole days", () => {
		expect(
			portionText({ durationName: null, startTime: null, endTime: null }, t)
		).toBeUndefined();
	});
});

describe("timeRangeText", () => {
	it("marks a range past midnight as ending the next day", () => {
		expect(timeRangeText("22:00", "02:00", t)).toBe("22:00–02:00 next day");
		expect(timeRangeText("09:00", "13:00", t)).toBe("09:00–13:00");
	});

	it("has Spanish copy", () => {
		expect(timeRangeText("22:00", "02:00", i18n.getFixedT("es"))).toBe(
			"22:00–02:00 del día siguiente"
		);
	});
});
