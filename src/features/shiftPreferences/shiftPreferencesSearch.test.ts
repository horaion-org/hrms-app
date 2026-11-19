import { describe, expect, it } from "vitest";
import {
	isPastWeek,
	parseShiftPreferencesSearch,
	SHIFT_PREFERENCES_TEAM_UNIT_RULES,
	shiftPreferencesUnitRulesOf,
	viewOf,
	viewsOf,
	weekOf,
	weekParameter,
} from "@/features/shiftPreferences/shiftPreferencesSearch";

const WEDNESDAY = new Date("2026-11-04T12:00:00");

describe("parseShiftPreferencesSearch", () => {
	it("given_everyPart_when_parsed_then_keepsThem", () => {
		expect(
			parseShiftPreferencesSearch({
				view: "team",
				branch: "b-1",
				department: "d-1",
				week: "2026-11-09",
				day: "2026-11-11",
			})
		).toEqual({
			view: "team",
			branch: "b-1",
			department: "d-1",
			week: "2026-11-09",
			day: "2026-11-11",
		});
	});

	it("given_nothing_when_parsed_then_leavesEveryPartAtItsDefault", () => {
		expect(parseShiftPreferencesSearch({})).toEqual({});
	});

	it("given_unknownOrMalformedParts_when_parsed_then_dropsThem", () => {
		expect(
			parseShiftPreferencesSearch({
				view: "preferences",
				week: "2026-11-10",
				day: "soon",
				page: "2",
			})
		).toEqual({});
	});
});

describe("the week", () => {
	it("given_noWeekInTheUrl_when_read_then_isTheWeekTodayIsIn", () => {
		expect(weekOf({}, WEDNESDAY)).toBe("2026-11-02");
	});

	it("given_thisWeek_when_putInTheUrl_then_isLeftOut", () => {
		expect(weekParameter("2026-11-02", WEDNESDAY)).toBeUndefined();
		expect(weekParameter("2026-11-09", WEDNESDAY)).toBe("2026-11-09");
	});

	it("given_aWeekBeforeThisOne_when_asked_then_hasEnded", () => {
		expect(isPastWeek("2026-10-26", WEDNESDAY)).toBe(true);
		expect(isPastWeek("2026-11-02", WEDNESDAY)).toBe(false);
	});
});

describe("the tabs", () => {
	it("given_theReadKeyOrNot_when_listed_then_ownPreferencesComeFirstForEveryone", () => {
		expect(viewsOf(false)).toEqual(["mine"]);
		expect(viewsOf(true)).toEqual(["mine", "team"]);
	});

	it("given_aTabTheyLack_when_asked_then_showsTheirOwn", () => {
		expect(viewOf("team", ["mine"])).toBe("mine");
		expect(viewOf("team", ["mine", "team"])).toBe("team");
		expect(viewOf(undefined, ["mine", "team"])).toBe("mine");
	});

	it("given_aView_when_asked_then_onlyTheTeamListsByBranch", () => {
		expect(shiftPreferencesUnitRulesOf("team")).toBe(
			SHIFT_PREFERENCES_TEAM_UNIT_RULES
		);
		expect(shiftPreferencesUnitRulesOf("mine")).toBeUndefined();
		expect(shiftPreferencesUnitRulesOf(undefined)).toBeUndefined();
	});
});
