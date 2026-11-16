import { describe, expect, it } from "vitest";
import {
	parseSettingsSearch,
	selectedSection,
	visibleGroups,
	type OptionalSections,
} from "@/features/settings/sections";

describe("parseSettingsSearch", () => {
	it("keeps a known section, General included, and drops unknown values and other types", () => {
		expect(parseSettingsSearch({ section: "data" })).toEqual({
			section: "data",
		});
		expect(parseSettingsSearch({ section: "leave-durations" })).toEqual({
			section: "leave-durations",
		});
		expect(parseSettingsSearch({ section: "general" })).toEqual({
			section: "general",
		});
		expect(parseSettingsSearch({ section: "billing" })).toEqual({});
		expect(parseSettingsSearch({ section: 3 })).toEqual({});
		expect(parseSettingsSearch({})).toEqual({});
	});

	it.each([
		[{ section: "leave" }, "leave-types"],
		[{ section: "approvals", subject: "leave" }, "leave-approvals"],
		[{ section: "approvals", subject: "roster" }, "roster-approvals"],
		[{ section: "approvals" }, "roster-approvals"],
		[{ section: "approvals", subject: "overtime" }, "roster-approvals"],
	])("opens the old address %o as %s", (search, section) => {
		expect(parseSettingsSearch(search)).toEqual({ section });
	});

	it("keeps `terms` only with Employment terms, for a link to one terms", () => {
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

describe("visibleGroups and selectedSection", () => {
	const nothing: OptionalSections = {
		employment: false,
		scheduling: false,
		"roster-approvals": false,
		"leave-types": false,
		"leave-durations": false,
		"leave-approvals": false,
		access: false,
		data: false,
	};
	const everything: OptionalSections = {
		employment: true,
		scheduling: true,
		"roster-approvals": true,
		"leave-types": true,
		"leave-durations": true,
		"leave-approvals": true,
		access: true,
		data: true,
	};

	it("lists every group in order when everything is offered", () => {
		expect(visibleGroups(everything)).toEqual([
			{ group: "workspace", sections: ["general", "notifications"] },
			{
				group: "rostering",
				sections: ["employment", "scheduling", "roster-approvals"],
			},
			{
				group: "leave",
				sections: ["leave-types", "leave-durations", "leave-approvals"],
			},
			{ group: "accessAndData", sections: ["access", "data"] },
			{ group: "account", sections: ["plan"] },
		]);
	});

	it("leaves out groups with nothing offered and keeps only the offered entries", () => {
		expect(visibleGroups(nothing)).toEqual([
			{ group: "workspace", sections: ["general", "notifications"] },
			{ group: "account", sections: ["plan"] },
		]);
		expect(visibleGroups({ ...nothing, "leave-durations": true })).toEqual([
			{ group: "workspace", sections: ["general", "notifications"] },
			{ group: "leave", sections: ["leave-durations"] },
			{ group: "account", sections: ["plan"] },
		]);
	});

	it("selects the asked-for section when shown, otherwise General", () => {
		expect(selectedSection(visibleGroups(everything), "data")).toBe("data");
		expect(selectedSection(visibleGroups(nothing), "data")).toBe("general");
		expect(selectedSection(visibleGroups(nothing), "plan")).toBe("plan");
		expect(selectedSection(visibleGroups(nothing), undefined)).toBe("general");
	});
});
