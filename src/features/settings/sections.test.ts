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

	it("keeps `terms` only with Employment, for a link to one terms", () => {
		expect(
			parseSettingsSearch({ section: "employment", terms: "t-1" })
		).toEqual({ section: "employment", terms: "t-1" });
		expect(parseSettingsSearch({ section: "data", terms: "t-1" })).toEqual({
			section: "data",
		});
		expect(parseSettingsSearch({ section: "employment", terms: "" })).toEqual({
			section: "employment",
		});
	});
});

describe("searchForSection", () => {
	it("keeps General's address bare", () => {
		expect(searchForSection("general")).toEqual({});
		expect(searchForSection("data")).toEqual({ section: "data" });
	});
});

describe("visibleSections and selectedSectionIndex", () => {
	const everything = {
		employment: true,
		scheduling: true,
		leave: true,
		approvals: true,
		data: true,
	};
	const neither = {
		employment: false,
		scheduling: false,
		leave: false,
		approvals: false,
		data: false,
	};

	it("adds Employment, Scheduling, Leave, Approvals and Data only when they have something to offer", () => {
		expect(visibleSections(neither)).toEqual([
			"general",
			"notifications",
			"plan",
		]);
		expect(
			visibleSections({
				employment: false,
				scheduling: true,
				leave: false,
				approvals: false,
				data: false,
			})
		).toEqual(["general", "notifications", "scheduling", "plan"]);
		expect(
			visibleSections({
				employment: false,
				scheduling: false,
				leave: true,
				approvals: false,
				data: false,
			})
		).toEqual(["general", "notifications", "leave", "plan"]);
		expect(
			visibleSections({
				employment: true,
				scheduling: false,
				leave: false,
				approvals: false,
				data: false,
			})
		).toEqual(["general", "notifications", "employment", "plan"]);
		expect(
			visibleSections({
				employment: false,
				scheduling: false,
				leave: false,
				approvals: true,
				data: false,
			})
		).toEqual(["general", "notifications", "approvals", "plan"]);
		expect(visibleSections(everything)).toEqual([
			"general",
			"notifications",
			"employment",
			"scheduling",
			"leave",
			"approvals",
			"plan",
			"data",
		]);
	});

	it("selects the asked-for section, or General when it is not shown", () => {
		expect(selectedSectionIndex(visibleSections(everything), "data")).toBe(7);
		expect(selectedSectionIndex(visibleSections(everything), "leave")).toBe(4);
		expect(selectedSectionIndex(visibleSections(neither), "data")).toBe(0);
		expect(selectedSectionIndex(visibleSections(neither), "scheduling")).toBe(
			0
		);
		expect(selectedSectionIndex(visibleSections(neither), "plan")).toBe(2);
		expect(selectedSectionIndex(visibleSections(neither), undefined)).toBe(0);
	});
});
