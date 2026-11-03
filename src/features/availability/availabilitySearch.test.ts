import { describe, expect, it } from "vitest";
import {
	availabilityQueryOf,
	parseAvailabilitySearch,
	viewOf,
	viewsOf,
	weekOf,
	weekParameter,
} from "@/features/availability/availabilitySearch";

const WEDNESDAY = new Date("2026-11-04T12:00:00");

describe("parseAvailabilitySearch", () => {
	it("given_everyPart_when_parsed_then_keepsThem", () => {
		expect(
			parseAvailabilitySearch({
				view: "team",
				branch: "b-1",
				department: "d-1",
				week: "2026-11-09",
			})
		).toEqual({
			view: "team",
			branch: "b-1",
			department: "d-1",
			week: "2026-11-09",
		});
	});

	it("given_nothing_when_parsed_then_leavesEveryPartAtItsDefault", () => {
		expect(parseAvailabilitySearch({})).toEqual({});
	});

	it("given_unknownOrMalformedParts_when_parsed_then_dropsThem", () => {
		expect(
			parseAvailabilitySearch({
				view: "everyone",
				branch: "",
				week: "2026-11-10",
				page: 2,
			})
		).toEqual({});
		expect(parseAvailabilitySearch({ week: "next week" })).toEqual({});
	});
});

describe("weekOf and weekParameter", () => {
	it("given_noWeekInTheUrl_when_read_then_isTheWeekTodayIsIn", () => {
		expect(weekOf({}, WEDNESDAY)).toBe("2026-11-02");
		expect(weekOf({}, new Date("2026-11-09T00:30:00"))).toBe("2026-11-09");
		expect(weekOf({ week: "2026-11-16" }, WEDNESDAY)).toBe("2026-11-16");
	});

	it("given_thisWeek_when_putInTheUrl_then_isLeftOut", () => {
		expect(weekParameter("2026-11-02", WEDNESDAY)).toBeUndefined();
		expect(weekParameter("2026-11-09", WEDNESDAY)).toBe("2026-11-09");
	});
});

describe("viewsOf and viewOf", () => {
	it("given_whatThePersonHas_when_listed_then_putsMineFirst", () => {
		expect(viewsOf({ mine: true, team: true })).toEqual(["mine", "team"]);
		expect(viewsOf({ mine: false, team: true })).toEqual(["team"]);
		expect(viewsOf({ mine: false, team: false })).toEqual([]);
	});

	it("given_aTabTheyLack_when_asked_then_showsTheirFirstOrNone", () => {
		expect(viewOf("team", ["mine"])).toBe("mine");
		expect(viewOf(undefined, ["mine", "team"])).toBe("mine");
		expect(viewOf("team", ["mine", "team"])).toBe("team");
		expect(viewOf("mine", [])).toBeUndefined();
	});
});

describe("availabilityQueryOf", () => {
	it("given_aBranchAndWeek_when_built_then_addsTheUrlsDepartmentOnlyWhenNamed", () => {
		expect(availabilityQueryOf({}, "b-1", "2026-11-09")).toEqual({
			weekStartMonday: "2026-11-09",
			branchId: "b-1",
		});
		expect(
			availabilityQueryOf({ department: "d-1" }, "b-1", "2026-11-09")
		).toEqual({
			weekStartMonday: "2026-11-09",
			branchId: "b-1",
			departmentId: "d-1",
		});
	});
});
