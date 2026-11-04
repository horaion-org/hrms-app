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
	it("adds Data last only when it has something to offer", () => {
		expect(visibleSections(false)).toEqual([
			"general",
			"notifications",
			"scheduling",
			"plan",
		]);
		expect(visibleSections(true)).toEqual([
			"general",
			"notifications",
			"scheduling",
			"plan",
			"data",
		]);
	});

	it("selects the asked-for section, or General when it is not shown", () => {
		expect(selectedSectionIndex(visibleSections(true), "data")).toBe(4);
		expect(selectedSectionIndex(visibleSections(false), "data")).toBe(0);
		expect(selectedSectionIndex(visibleSections(false), "plan")).toBe(3);
		expect(selectedSectionIndex(visibleSections(false), undefined)).toBe(0);
	});
});
