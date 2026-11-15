import { describe, expect, it } from "vitest";
import { repairCells } from "@/features/scheduling/cover/engineRepairChange";
import {
	callInMove,
	feasibleRepair,
	infeasibleRepair,
	reassignMove,
	stretchMove,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { shiftCopyId } from "@/features/scheduling/shifts/fixtures";

const FRONT_DESK_AM = shiftCopyId("front-desk-am");

describe("repairCells", () => {
	it("turns a call-in into the person working the shift that day", () => {
		expect(repairCells(feasibleRepair([callInMove()]))).toEqual([
			{
				membershipId: "m-1",
				day: "2026-10-17",
				kind: "WORK",
				shiftId: FRONT_DESK_AM,
			},
		]);
	});

	it("turns a same-day move, and a chain of them, into each person's new shift", () => {
		expect(
			repairCells(
				feasibleRepair([
					reassignMove(),
					callInMove({ shiftId: shiftCopyId("swing-shift") }),
				])
			)
		).toEqual([
			{
				membershipId: "m-2",
				day: "2026-10-17",
				kind: "WORK",
				shiftId: FRONT_DESK_AM,
			},
			{
				membershipId: "m-1",
				day: "2026-10-17",
				kind: "WORK",
				shiftId: shiftCopyId("swing-shift"),
			},
		]);
	});

	it.each([
		["a stretch into overtime", feasibleRepair([stretchMove()])],
		[
			"a move to another day",
			feasibleRepair([reassignMove({ fromDate: "2026-10-16" })]),
		],
		[
			"someone the roster no longer names",
			feasibleRepair([callInMove({ membershipId: null })]),
		],
		[
			"a kind the app can't describe",
			feasibleRepair([{ ...callInMove(), kind: "UNKNOWN" }]),
		],
		[
			"two moves on one person's day",
			feasibleRepair([callInMove(), callInMove()]),
		],
		["an option with no moves", feasibleRepair([])],
		["an infeasible option", infeasibleRepair()],
	])("leaves %s to be made by hand", (_name, option) => {
		expect(repairCells(option)).toBeUndefined();
	});
});
