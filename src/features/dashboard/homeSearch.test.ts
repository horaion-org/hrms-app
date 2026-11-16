import { describe, expect, it } from "vitest";
import { homeTabOf, parseHomeSearch } from "@/features/dashboard/homeSearch";

describe("Home search", () => {
	it("keeps the view it recognises and drops the rest", () => {
		expect(parseHomeSearch({ tab: "overview", other: "x" })).toEqual({
			tab: "overview",
		});
		expect(parseHomeSearch({ tab: "reports" })).toEqual({});
	});

	it("opens the to-do list for someone who builds rosters, and the Overview for someone who only looks across units", () => {
		expect(homeTabOf(undefined, { overview: true, buildsRosters: true })).toBe(
			"needs-you"
		);
		expect(homeTabOf(undefined, { overview: true, buildsRosters: false })).toBe(
			"overview"
		);
	});

	it("keeps the view the URL names, unless the Overview is out of reach", () => {
		expect(homeTabOf("overview", { overview: true, buildsRosters: true })).toBe(
			"overview"
		);
		expect(
			homeTabOf("overview", { overview: false, buildsRosters: true })
		).toBe("needs-you");
	});
});
