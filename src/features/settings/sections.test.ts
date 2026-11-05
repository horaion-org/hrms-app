import { describe, expect, it } from "vitest";
import {
	parseSettingsSearch,
	searchForSection,
	selectedSectionIndex,
	visibleSections,
} from "@/features/settings/sections";

describe("parseSettingsSearch", () => {
	it("keeps a known section and drops General, unknown values and other types", () => {
		expect(parseSettingsSearch({ section: "data" })).toEqual({
			section: "data",
		});
		expect(parseSettingsSearch({ section: "plan" })).toEqual({
			section: "plan",
		});
		expect(parseSettingsSearch({ section: "leave" })).toEqual({
			section: "leave",
		});
		expect(parseSettingsSearch({ section: "general" })).toEqual({});
		expect(parseSettingsSearch({ section: "billing" })).toEqual({});
		expect(parseSettingsSearch({ section: 3 })).toEqual({});
		expect(parseSettingsSearch({})).toEqual({});
	});
});

describe("searchForSection", () => {
	it("keeps General's address bare", () => {
		expect(searchForSection("general")).toEqual({});
		expect(searchForSection("data")).toEqual({ section: "data" });
	});
});

describe("visibleSections and selectedSectionIndex", () => {
	const everything = { scheduling: true, leave: true, data: true };
	const neither = { scheduling: false, leave: false, data: false };

	it("adds Scheduling, Leave and Data only when they have something to offer", () => {
		expect(visibleSections(neither)).toEqual([
			"general",
			"notifications",
			"plan",
		]);
		expect(
			visibleSections({ scheduling: true, leave: false, data: false })
		).toEqual(["general", "notifications", "scheduling", "plan"]);
		expect(
			visibleSections({ scheduling: false, leave: true, data: false })
		).toEqual(["general", "notifications", "leave", "plan"]);
		expect(visibleSections(everything)).toEqual([
			"general",
			"notifications",
			"scheduling",
			"leave",
			"plan",
			"data",
		]);
	});

	it("selects the asked-for section, or General when it is not shown", () => {
		expect(selectedSectionIndex(visibleSections(everything), "data")).toBe(5);
		expect(selectedSectionIndex(visibleSections(everything), "leave")).toBe(3);
		expect(selectedSectionIndex(visibleSections(neither), "data")).toBe(0);
		expect(selectedSectionIndex(visibleSections(neither), "scheduling")).toBe(
			0
		);
		expect(selectedSectionIndex(visibleSections(neither), "plan")).toBe(2);
		expect(selectedSectionIndex(visibleSections(neither), undefined)).toBe(0);
	});
});
