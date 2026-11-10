import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { RosterLeaveMove } from "./rosterLeave";
import { leaveMoveChange, leaveMoveNotes } from "./leaveMoveCopy";

/** Echoes the key and its values, so notes can be read without copy. */
const t = ((key: string, values?: Record<string, unknown>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;

const facts = { name: "Aisha", day: "Mon 12 Oct", dayHasShift: true };
const note = (name: string): string =>
	`scheduling.rosterEdit.leaveNote.${name}(Aisha|Mon 12 Oct)`;

describe("leaveMoveNotes", () => {
	it.each<[RosterLeaveMove | undefined, boolean, Array<string>]>([
		[
			{ kind: "putOnLeave", leaveType: "ANNUAL" },
			true,
			[note("putOnLeave"), note("needsCover")],
		],
		[
			{ kind: "putOnLeave", leaveType: "ANNUAL" },
			false,
			[note("putOnLeave"), note("usesNoLeave")],
		],
		[{ kind: "changeType", leaveType: "SICK" }, true, [note("oneDayOnly")]],
		[{ kind: "backToDayOff" }, true, [note("backToDayOff")]],
		[{ kind: "backToShift", shiftId: "sh-1" }, true, []],
		[undefined, true, []],
	])("for %o (shift that day: %s) says %o", (move, dayHasShift, notes) => {
		expect(leaveMoveNotes(move, { ...facts, dayHasShift }, t)).toEqual(notes);
	});
});

describe("leaveMoveChange", () => {
	const label = (code: string): string => `label:${code}`;

	it.each<[RosterLeaveMove, string]>([
		[{ kind: "putOnLeave", leaveType: "ANNUAL" }, "label:ANNUAL"],
		[{ kind: "changeType", leaveType: "SICK" }, "label:SICK"],
		[{ kind: "backToDayOff" }, "scheduling.rosterEdit.dayOff"],
	])("for %o reads the day after as %s", (move, after) => {
		expect(leaveMoveChange(move, "Morning", label, t)).toEqual({
			before: "Morning",
			after,
		});
	});
});
