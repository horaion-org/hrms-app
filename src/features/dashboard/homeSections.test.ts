import { describe, expect, it } from "vitest";
import {
	HOME_SECTIONS,
	isShown,
	sectionsInReach,
	withSectionShown,
} from "@/features/dashboard/homeSections";

describe("Home sections", () => {
	it("shows every section by default", () => {
		expect(HOME_SECTIONS.every((section) => isShown(section, []))).toBe(true);
	});

	it("offers only the sections a person's grants reach, their own offers always", () => {
		expect(sectionsInReach(() => false)).toEqual(["cover-offers"]);
		expect(
			sectionsInReach((keys) => keys.includes("leave_request:read"))
		).toEqual(["leave-to-decide", "cover-offers", "off-today"]);
		expect(sectionsInReach(() => true)).toEqual([...HOME_SECTIONS]);
	});

	it("hides a section once its key is saved, and ignores keys it does not know", () => {
		const hidden = ["people-events", "a-retired-section"];

		expect(isShown("people-events", hidden)).toBe(false);
		expect(isShown("short-shifts", hidden)).toBe(true);
	});

	it("hides and shows a section, sorted, keeping keys it does not know", () => {
		const hidden = withSectionShown(["zz-future"], "off-today", false);

		expect(hidden).toEqual(["off-today", "zz-future"]);
		expect(withSectionShown(hidden, "off-today", true)).toEqual(["zz-future"]);
	});
});
