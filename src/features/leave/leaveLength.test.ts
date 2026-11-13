import i18n from "i18next";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import { durationText, minutesBetween } from "@/features/leave/leaveLength";

const t = i18n.getFixedT("en");

describe("minutesBetween", () => {
	it("counts the minutes between two times of one day", () => {
		expect(minutesBetween("09:00", "13:00")).toBe(240);
		expect(minutesBetween("10:00", "12:30")).toBe(150);
	});

	it("counts past midnight when the end is before the start", () => {
		expect(minutesBetween("22:00", "02:00")).toBe(240);
	});

	it("counts equal times as nothing", () => {
		expect(minutesBetween("09:00", "09:00")).toBe(0);
	});
});

describe("durationText", () => {
	it.each([
		[240, "4 h"],
		[150, "2 h 30 min"],
		[45, "45 min"],
	])("words %i minutes as %s", (minutes, text) => {
		expect(durationText(minutes, t)).toBe(text);
	});

	it("has Spanish copy", () => {
		expect(durationText(150, i18n.getFixedT("es"))).toBe("2 h 30 min");
	});
});
