import { describe, expect, it } from "vitest";
import { parseLeaveSearch } from "@/features/leave/leaveSearch";

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
