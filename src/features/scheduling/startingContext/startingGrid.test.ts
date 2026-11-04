import { describe, expect, it } from "vitest";
import {
	carriedWeek,
	firstWeek,
} from "@/features/scheduling/startingContext/fixtures";
import {
	enteredDays,
	enteredMemberCount,
	fillEmpty,
	initialEntries,
	previousWeekOf,
	runsByMember,
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
