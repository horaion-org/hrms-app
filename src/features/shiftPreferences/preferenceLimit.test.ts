import { describe, expect, it } from "vitest";
import { MONDAY_WITH_MORNING } from "@/features/shiftPreferences/fixtures";
import {
	chosenShiftIds,
	isAtLimit,
	preferredShifts,
	toggledShiftIds,
} from "@/features/shiftPreferences/preferenceLimit";

const MAX = 2;

describe("preference limit", () => {
	it("given_aDay_when_itsChoiceIsRead_then_listsOnlyThePreferredShifts", () => {
		expect(chosenShiftIds(MONDAY_WITH_MORNING)).toEqual(["s-morning"]);
	});

	it("given_aDay_when_itsPreferredShiftsAreRead_then_keepsOnlyTheChosenOnes", () => {
		expect(
			preferredShifts(MONDAY_WITH_MORNING).map((shift) => shift.name)
		).toEqual(["Morning"]);
	});

	it("given_aCountAtOrOverTheMax_when_checked_then_isAtTheLimit", () => {
		expect(isAtLimit(1, MAX)).toBe(false);
		expect(isAtLimit(2, MAX)).toBe(true);
	});

	it("given_aChosenShift_when_tapped_then_isTakenOut", () => {
		expect(toggledShiftIds(["a", "b"], "a", MAX)).toEqual(["b"]);
	});

	it("given_roomLeft_when_anotherShiftIsTapped_then_isAdded", () => {
		expect(toggledShiftIds(["a"], "b", MAX)).toEqual(["a", "b"]);
	});

	it("given_aFullDay_when_anotherShiftIsTapped_then_nothingChanges", () => {
		expect(toggledShiftIds(["a", "b"], "c", MAX)).toEqual(["a", "b"]);
	});
});
