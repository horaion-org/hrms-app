import { describe, expect, it } from "vitest";
import type {
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";
import {
	type DayBeforeRun,
	daysBeforeRunOf,
} from "@/features/scheduling/startingContext/daysBeforeRun";
import {
	DAYS_BEFORE,
	enteredNightCell,
	firstWeek,
	leaveCell,
	rosterOffCell,
	unknownCell,
} from "@/features/scheduling/startingContext/fixtures";

const DAY = "2026-11-08";

/** A day a generated roster says was worked on its Day shift. */
const rosterDayCell: StartingCell = {
	...unknownCell(DAY),
	kind: "WORKED",
	source: "GENERATED",
	locked: true,
	shiftName: "Day",
	startTime: "07:00",
	endTime: "19:00",
};

/** Tan's 14 days, all unknown but `cell` on its own date. */
const withTanCell = (cell: StartingCell): StartingDays => ({
	...firstWeek(),
	members: [
		{
			memberProfileId: "p-tan",
			displayName: "Tan Wei Ming",
			jobTitleName: "Officer",
			cells: DAYS_BEFORE.map((date) =>
				date === cell.date ? cell : unknownCell(date)
			),
		},
	],
});

const tanOn = (
	what: DayBeforeRun["what"],
	enteredByHand: boolean
): Array<DayBeforeRun> => [
	{ memberProfileId: "p-tan", date: DAY, what, enteredByHand },
];

describe("daysBeforeRunOf", () => {
	it.each([
		[
			"an entered shift",
			enteredNightCell(DAY),
			tanOn(
				{ kind: "shift", name: "Night", start: "22:00", end: "06:00" },
				true
			),
		],
		[
			"an entered rest day",
			{ ...unknownCell(DAY), kind: "OFF", source: "ENTERED", dayType: "REST" },
			tanOn({ kind: "off", dayType: "REST" }, true),
		],
		[
			"an entered day off without a type",
			{ ...unknownCell(DAY), kind: "OFF", source: "ENTERED" },
			tanOn({ kind: "off", dayType: null }, true),
		],
		[
			"a rostered worked day",
			rosterDayCell,
			tanOn(
				{ kind: "shift", name: "Day", start: "07:00", end: "19:00" },
				false
			),
		],
		[
			"a rostered day off",
			{ ...rosterOffCell(DAY), dayType: "REST" },
			tanOn({ kind: "off", dayType: "REST" }, false),
		],
		[
			"leave on a roster",
			{ ...rosterOffCell(DAY), kind: "LEAVE" },
			tanOn({ kind: "leave" }, false),
		],
		["approved leave", leaveCell(DAY), tanOn({ kind: "leave" }, false)],
		["a day not known", unknownCell(DAY), []],
		[
			"an entered shift no longer in use",
			{ ...enteredNightCell(DAY), shiftId: null, shiftName: null },
			[],
		],
		[
			"a rostered worked day without its times",
			{ ...rosterDayCell, startTime: null, endTime: null },
			[],
		],
		["a kind a newer API adds", { ...rosterOffCell(DAY), kind: "UNKNOWN" }, []],
	] satisfies Array<[string, StartingCell, Array<DayBeforeRun>]>)(
		"reads %s",
		(_name, cell, expected) => {
			expect(daysBeforeRunOf(withTanCell(cell))).toEqual(expected);
		}
	);

	it("gives every known day by person then day", () => {
		expect(daysBeforeRunOf(firstWeek())).toEqual([
			{
				memberProfileId: "p-tan",
				date: "2026-11-07",
				what: { kind: "leave" },
				enteredByHand: false,
			},
			{
				memberProfileId: "p-tan",
				date: "2026-11-08",
				what: { kind: "shift", name: "Night", start: "22:00", end: "06:00" },
				enteredByHand: true,
			},
		]);
	});
});
