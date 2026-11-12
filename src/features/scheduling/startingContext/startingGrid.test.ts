import { describe, expect, it } from "vitest";
import {
	carriedWeek,
	DAYS_BEFORE,
	EARLIER_WEEK,
	firstWeek,
	typedDaysOffWeek,
	WEEK_BEFORE,
} from "@/features/scheduling/startingContext/fixtures";
import {
	cellOn,
	enteredDays,
	enteredMemberCount,
	fillEmpty,
	hasEnteredDayOn,
	initialEntries,
	offCellValue,
	offDayTypes,
	previousWeekOf,
	runsByMember,
	splitDays,
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
		const dayOff = offCellValue(null);
		const entries = fillEmpty(
			initialEntries(firstWeek()),
			"2026-11-08",
			dayOff
		);

		expect(entries["p-tan"]?.["2026-11-08"]).toBe("shift:s-night");
		expect(entries["p-siti"]?.["2026-11-08"]).toBe(dayOff);
		expect(
			fillEmpty(entries, "2026-11-07", dayOff)["p-tan"]
		).not.toHaveProperty("2026-11-07");
	});

	it("given_entries_when_theBodyIsBuilt_then_emptyCellsAreNotKnownAndLeftOut", () => {
		const entries = withCell(
			initialEntries(firstWeek()),
			"p-siti",
			"2026-11-06",
			offCellValue(null)
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

	it("given_typedDaysOff_when_readAndSentBack_then_eachKeepsItsTypeIncludingOneNoLongerOffered", () => {
		const entries = initialEntries(typedDaysOffWeek());

		expect(entries["p-tan"]).not.toHaveProperty("2026-11-05");
		expect(entries["p-siti"]?.["2026-11-06"]).toBe("off:REST");
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
				dayType: "REST",
			},
			{
				memberProfileId: "p-siti",
				date: "2026-11-07",
				kind: "OFF",
				shiftId: null,
				dayType: "PUBLIC_HOLIDAY_OFF",
			},
		]);
	});

	it("given_aDayOffWithoutAType_when_sent_then_theTypeIsLeftOut", () => {
		const entries = withCell({}, "p-siti", "2026-11-06", offCellValue(null));

		expect(enteredDays(entries)[0]).not.toHaveProperty("dayType");
	});

	it("given_theSchedulesTypes_when_listed_then_themThenAnyEnteredTypeNoLongerOffered", () => {
		expect(offDayTypes(typedDaysOffWeek(), ["OFF", "REST"])).toEqual([
			"OFF",
			"REST",
			"PUBLIC_HOLIDAY_OFF",
		]);
	});

	it("given_anOlderApiWithNoTypes_when_listed_then_aDayOffWithoutAType", () => {
		expect(offDayTypes(firstWeek(), [])).toEqual([null]);
	});

	it("given_fourteenDays_when_split_then_sevenEarlierAndTheSevenNearerInOrder", () => {
		const { earlier, nearer } = splitDays(DAYS_BEFORE);

		expect(earlier).toEqual(EARLIER_WEEK);
		expect(nearer).toEqual(WEEK_BEFORE);
	});

	it("given_sevenDays_when_split_then_noEarlierDays", () => {
		const { earlier, nearer } = splitDays(WEEK_BEFORE);

		expect(earlier).toEqual([]);
		expect(nearer).toEqual(WEEK_BEFORE);
	});

	it("given_entries_when_askedForEnteredDays_then_onlyNonEmptyValuesOnThoseDatesCount", () => {
		const entries = initialEntries(firstWeek());

		expect(hasEnteredDayOn(entries, ["2026-11-08"])).toBe(true);
		expect(hasEnteredDayOn(entries, ["2026-11-06"])).toBe(false);
		expect(hasEnteredDayOn(entries, ["2026-10-30"])).toBe(false);
		expect(hasEnteredDayOn(entries, [])).toBe(false);
	});

	it("given_aMember_when_aCellIsLookedUpByDate_then_foundOrUndefined", () => {
		const tan = firstWeek().members[0]!;

		expect(cellOn(tan, "2026-11-08")?.shiftName).toBe("Night");
		expect(cellOn(tan, "2026-10-25")).toBeUndefined();
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
