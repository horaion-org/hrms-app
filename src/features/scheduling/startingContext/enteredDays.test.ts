import { describe, expect, it } from "vitest";
import type { StartingCell } from "@/features/scheduling/startingContext/api";
import {
	enteredDaysBeforeOf,
	enteredWhatOf,
	peopleWithEnteredDays,
} from "@/features/scheduling/startingContext/enteredDays";
import {
	carriedWeek,
	enteredNightCell,
	firstWeek,
	leaveCell,
	rosterOffCell,
	unknownCell,
} from "@/features/scheduling/startingContext/fixtures";

const DAY = "2026-11-08";

/** A day off a scheduler entered, of the given type or of none. */
const enteredOffCell = (dayType: string | null): StartingCell => ({
	...unknownCell(DAY),
	kind: "OFF",
	source: "ENTERED",
	dayType,
});

const NIGHT = { kind: "shift", name: "Night", start: "22:00", end: "06:00" };

describe("enteredWhatOf", () => {
	it.each([
		["a day not known", unknownCell(DAY), undefined],
		["a day a roster fills", rosterOffCell(DAY), undefined],
		["a day approved leave fills", leaveCell(DAY), undefined],
		["an entered shift", enteredNightCell(DAY), NIGHT],
		[
			"an entered rest day",
			enteredOffCell("REST"),
			{ kind: "off", dayType: "REST" },
		],
		[
			"an entered day off without a type",
			enteredOffCell(null),
			{ kind: "off", dayType: null },
		],
		// The grid to enter them shows such a day as not known, so the roster shows none either.
		[
			"an entered shift no longer in use",
			{ ...enteredNightCell(DAY), shiftId: null, shiftName: null },
			undefined,
		],
	])("reads %s", (_name, cell, expected) => {
		expect(enteredWhatOf(cell)).toEqual(expected);
	});
});

describe("enteredDaysBeforeOf", () => {
	/** Tan's leave on Saturday and every unknown day are left out; only the Sunday night he was entered for is given. */
	it("gives each entered day with its person, and no roster, leave or unknown day", () => {
		expect(enteredDaysBeforeOf(firstWeek())).toEqual([
			{
				memberProfileId: "p-tan",
				name: "Tan Wei Ming",
				jobTitle: "Officer",
				date: DAY,
				what: NIGHT,
			},
		]);
	});

	it("gives none when rosters cover the days before", () => {
		expect(enteredDaysBeforeOf(carriedWeek())).toEqual([]);
	});
});

describe("peopleWithEnteredDays", () => {
	it.each([
		["one person entered, one unknown", firstWeek(), 1],
		["nobody entered", carriedWeek(), 0],
	])("counts %s", (_name, startingDays, expected) => {
		expect(peopleWithEnteredDays(startingDays)).toBe(expected);
	});
});
