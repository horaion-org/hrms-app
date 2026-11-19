import { describe, expect, it } from "vitest";
import {
	leaveViewOf,
	leaveViewsOf,
	parseLeaveSearch,
} from "@/features/leave/leaveSearch";

describe("parseLeaveSearch", () => {
	it("given_aTimelineDay_when_parsed_then_keepsIt", () => {
		expect(parseLeaveSearch({ view: "timeline", day: "2026-11-11" })).toEqual({
			view: "timeline",
			day: "2026-11-11",
		});
	});

	it("given_aMalformedDay_when_parsed_then_dropsIt", () => {
		expect(parseLeaveSearch({ view: "timeline", day: "Wednesday" })).toEqual({
			view: "timeline",
		});
	});

	it("given_theDefaults_when_parsed_then_leavesThemOut", () => {
		expect(parseLeaveSearch({ page: 1, sort: "requestedAt,desc" })).toEqual({});
	});
});

describe("leaveViewsOf and leaveViewOf", () => {
	it.each([
		{ mine: true, team: true, views: ["mine", "requests", "timeline"] },
		{ mine: true, team: false, views: ["mine"] },
		{ mine: false, team: true, views: ["requests", "timeline"] },
		{ mine: false, team: false, views: [] },
	])(
		"given_mine_$mine_and_team_$team_when_listed_then_$views",
		({ mine, team, views }) => {
			expect(leaveViewsOf({ mine, team })).toEqual(views);
		}
	);

	/** A team view the person lacks, or none asked for, falls back to their first tab; no tab at all is undefined. */
	it.each([
		{
			requested: undefined,
			views: ["mine", "requests", "timeline"],
			shown: "mine",
		},
		{
			requested: "timeline",
			views: ["mine", "requests", "timeline"],
			shown: "timeline",
		},
		{ requested: "requests", views: ["mine"], shown: "mine" },
		{
			requested: undefined,
			views: ["requests", "timeline"],
			shown: "requests",
		},
		{
			requested: "timeline",
			views: ["requests", "timeline"],
			shown: "timeline",
		},
		{ requested: "requests", views: [], shown: undefined },
	] as const)(
		"given_$requested_among_$views_when_chosen_then_shows_$shown",
		({ requested, views, shown }) => {
			expect(leaveViewOf(requested, views)).toBe(shown);
		}
	);
});
