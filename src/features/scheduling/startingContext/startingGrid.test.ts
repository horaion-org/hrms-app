import { describe, expect, it } from "vitest";
import {
	answeredWeek,
	carriedWeek,
	firstWeek,
	leaveCell,
	nothingAskedWeek,
	notAskedCell,
	unknownCell,
} from "@/features/scheduling/startingContext/fixtures";
import {
	enteredDays,
	enteredMemberCount,
	fillEmpty,
	initialEntries,
	isNotAsked,
	markMissingOff,
	missingDayCounts,
	previousWeekOf,
	runsByMember,
	shiftCellValue,
	unansweredByMember,
	withCell,
} from "@/features/scheduling/startingContext/startingGrid";

describe("startingGrid", () => {
	it("given_aFirstWeek_when_entriesAreRead_then_lockedCellsAreLeftOutAndEnteredOnesKept", () => {
		const entries = initialEntries(firstWeek());

		expect(entries["p-tan"]).not.toHaveProperty("2026-11-07");
		expect(entries["p-tan"]?.["2026-11-08"]).toBe("shift:s-night");
		expect(entries["p-siti"]?.["2026-11-08"]).toBe("");
		expect(enteredMemberCount(entries)).toBe(1);
	});

	it("given_emptyAndEnteredCells_when_aDayIsFilled_then_onlyEmptyUnlockedCellsChange", () => {
		const entries = fillEmpty(initialEntries(firstWeek()), "2026-11-08", "OFF");

		expect(entries["p-tan"]?.["2026-11-08"]).toBe("shift:s-night");
		expect(entries["p-siti"]?.["2026-11-08"]).toBe("OFF");
		expect(fillEmpty(entries, "2026-11-07", "OFF")["p-tan"]).not.toHaveProperty(
			"2026-11-07"
		);
	});

	it("given_entries_when_theBodyIsBuilt_then_emptyCellsAreNotKnownAndLeftOut", () => {
		const entries = withCell(
			initialEntries(firstWeek()),
			"p-siti",
			"2026-11-06",
			"OFF"
		);

		expect(enteredDays(entries)).toEqual([
			{
				memberProfileId: "p-tan",
				date: "2026-11-08",
				kind: "SHIFT",
				shiftId: "s-night",
			},
			{
				memberProfileId: "p-siti",
				date: "2026-11-06",
				kind: "OFF",
				shiftId: null,
			},
		]);
	});

	it.each([
		["an unknown day generation needs", unknownCell("2026-11-08"), false],
		["a day before the member started", notAskedCell("2026-11-08"), true],
		["a locked day", leaveCell("2026-11-08"), false],
	])("given_%s_when_askedAbout_then_notAskedIs_%s", (_, cell, notAsked) => {
		expect(isNotAsked(cell)).toBe(notAsked);
	});

	it("given_aMemberWhoStartedLate_when_entriesAreRead_then_theirDaysBeforeAreLeftOut", () => {
		const week = nothingAskedWeek();

		expect(initialEntries(week)).toEqual({ "p-tan": {}, "p-siti": {} });
		expect(fillEmpty(initialEntries(week), "2026-11-08", "OFF")).toEqual({
			"p-tan": {},
			"p-siti": {},
		});
	});

	it.each([
		["a first roster", firstWeek(), { days: 12, people: 2 }],
		["a new joiner off the roster", carriedWeek(), { days: 7, people: 1 }],
		["every day answered", answeredWeek(), { days: 0, people: 0 }],
		["nobody asked", nothingAskedWeek(), { days: 0, people: 0 }],
	])("given_%s_when_counted_then_daysAndPeople", (_, week, expected) => {
		expect(missingDayCounts(week)).toEqual(expected);
	});

	it("given_aMissingDayChosenInTheGrid_when_counted_then_onlyBlankOnesRemain", () => {
		const week = firstWeek();
		const entries = withCell(
			initialEntries(week),
			"p-siti",
			"2026-11-08",
			shiftCellValue("s-day")
		);

		expect(unansweredByMember(week, entries)).toEqual(
			new Map([
				["p-tan", 5],
				["p-siti", 6],
			])
		);
	});

	it("given_everyMissingDayChosen_when_counted_then_noMemberIsListed", () => {
		const week = firstWeek();

		expect(
			unansweredByMember(week, markMissingOff(week, initialEntries(week))).size
		).toBe(0);
	});

	it("given_chosenAndBlankDays_when_markedOff_then_onlyBlankMissingDaysChange", () => {
		const week = firstWeek();
		const chosen = shiftCellValue("s-day");
		const entries = withCell(
			initialEntries(week),
			"p-siti",
			"2026-11-08",
			chosen
		);

		const marked = markMissingOff(week, entries);

		expect(marked["p-siti"]?.["2026-11-08"]).toBe(chosen);
		expect(marked["p-siti"]?.["2026-11-07"]).toBe("OFF");
		expect(marked["p-tan"]?.["2026-11-08"]).toBe(shiftCellValue("s-night"));
		expect(marked["p-tan"]?.["2026-11-02"]).toBe("OFF");
		expect(marked["p-tan"]).not.toHaveProperty("2026-11-07");
	});

	it("given_noPreviousRoster_when_described_then_none", () => {
		expect(previousWeekOf(firstWeek())).toEqual({ kind: "none" });
	});

	it("given_aPreviousRosterMissingANewJoiner_when_described_then_carriedWithOneUncovered", () => {
		expect(previousWeekOf(carriedWeek())).toEqual({
			kind: "carried",
			periodStart: "2026-11-02",
			uncovered: 1,
		});
	});

	it("given_aContext_when_runsAreRead_then_onlyMembersWhoBroughtARunAreKept", () => {
		const runs = runsByMember({
			frozen: true,
			staleMemberProfileIds: [],
			members: [
				{
					memberProfileId: "p-tan",
					displayName: "Tan Wei Ming",
					consecutiveWorkingDays: 3,
					trailingSevenDays: "----WWW",
					source: "PUBLISHED",
				},
				{
					memberProfileId: "p-siti",
					displayName: "Siti Rahmah",
					consecutiveWorkingDays: 0,
					trailingSevenDays: "-------",
					source: "NONE",
				},
			],
		});

		expect([...runs]).toEqual([["p-tan", 3]]);
	});
});
