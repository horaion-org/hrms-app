import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import {
	isLeaveDay,
	leaveMoveOf,
	moveChangesRoster,
	needsDecision,
	panelModes,
	rosterLeaveRefusal,
} from "@/features/scheduling/rosterChanges/rosterLeave";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const working = scheduleAssignmentsFixture().find((row) => row.shift !== null)!;
const dayOff: ScheduleAssignment = {
	...working,
	off: true,
	offReason: "OFF",
	shift: null,
	jobTitle: null,
};
const onLeave: ScheduleAssignment = {
	...dayOff,
	offReason: "LEAVE",
	leaveRequestId: "r-1",
};
const dayOffUnderLeave: ScheduleAssignment = {
	...dayOff,
	leaveRequestId: "r-1",
};
const toDecide: ScheduleAssignment = { ...dayOff, flag: "NEEDS_DECISION" };
const pending: ScheduleAssignment = {
	...working,
	flag: "LEAVE_REQUESTED",
	leaveRequestId: "r-1",
};
const lastLeaveChange: ScheduleAssignment = {
	...onLeave,
	lastChange: {
		changeId: "c",
		appliedAt: "2026-10-01T00:00:00Z",
		appliedBy: null,
		remark: null,
		reason: "LEAVE_RECORDED",
		before: { kind: "WORK", shift: null, jobTitle: null },
	},
};

describe("panelModes", () => {
	it.each([
		[
			"a shift, with leave keys",
			working,
			true,
			["shift", "dayOff", "leave", "swap"],
		],
		["a shift, without", working, false, ["shift", "dayOff", "swap"]],
		["a day off", dayOff, true, ["shift", "leave", "swap"]],
		["a leave day", onLeave, true, ["anotherType", "shift", "dayOff"]],
		["a leave day, without leave keys", onLeave, false, []],
		[
			"a day off under leave",
			dayOffUnderLeave,
			true,
			["anotherType", "shift", "dayOff"],
		],
		[
			"a day off under leave, without",
			dayOffUnderLeave,
			false,
			["shift", "swap"],
		],
		["a day to decide", toDecide, false, ["shift", "dayOff", "swap"]],
		["a pending request", pending, true, ["shift", "dayOff", "swap"]],
	] as const)("given_%s", (_, assignment, mayChangeLeave, expected) => {
		expect(panelModes({ assignment, hasShifts: true, mayChangeLeave })).toEqual(
			expected
		);
	});

	it("given_noFrozenShifts_when_onLeave_then_noShiftChoice", () => {
		expect(
			panelModes({
				assignment: onLeave,
				hasShifts: false,
				mayChangeLeave: true,
			})
		).toEqual(["anotherType", "dayOff"]);
	});
});

describe("leaveMoveOf", () => {
	const none = { leaveType: undefined, shiftId: undefined };

	it("names each move once its choice is complete", () => {
		expect(
			leaveMoveOf(working, "leave", { ...none, leaveType: "SICK" })
		).toEqual({ kind: "putOnLeave", leaveType: "SICK" });
		expect(
			leaveMoveOf(onLeave, "anotherType", { ...none, leaveType: "SICK" })
		).toEqual({ kind: "changeType", leaveType: "SICK" });
		expect(leaveMoveOf(onLeave, "dayOff", none)).toEqual({
			kind: "backToDayOff",
		});
		expect(leaveMoveOf(onLeave, "shift", { ...none, shiftId: "s" })).toEqual({
			kind: "backToShift",
			shiftId: "s",
		});
	});

	it("leaves a plain roster edit and an incomplete choice alone", () => {
		expect(leaveMoveOf(working, "dayOff", none)).toBeUndefined();
		expect(
			leaveMoveOf(working, "shift", { ...none, shiftId: "s" })
		).toBeUndefined();
		expect(leaveMoveOf(working, "leave", none)).toBeUndefined();
	});
});

describe("needsDecision", () => {
	it("is a day to decide however the viewer may read it", () => {
		expect(needsDecision(toDecide)).toBe(true);
		expect(needsDecision({ ...dayOff, flag: "NEEDS_ATTENTION" })).toBe(true);
		expect(needsDecision(dayOff)).toBe(false);
	});
});

describe("isLeaveDay", () => {
	it("is a day with no shift and an approved request behind it", () => {
		expect(isLeaveDay(onLeave)).toBe(true);
		expect(isLeaveDay(dayOffUnderLeave)).toBe(true);
		expect(isLeaveDay(dayOff)).toBe(false);
		expect(isLeaveDay(pending)).toBe(false);
	});
});

describe("moveChangesRoster", () => {
	it("is true only where a move writes the roster, which on a published one asks first", () => {
		expect(
			moveChangesRoster(working, { kind: "putOnLeave", leaveType: "SICK" })
		).toBe(true);
		expect(
			moveChangesRoster(dayOff, { kind: "putOnLeave", leaveType: "SICK" })
		).toBe(false);
		expect(
			moveChangesRoster(onLeave, { kind: "changeType", leaveType: "SICK" })
		).toBe(false);
		expect(moveChangesRoster(onLeave, { kind: "backToDayOff" })).toBe(false);
		expect(moveChangesRoster(lastLeaveChange, { kind: "backToDayOff" })).toBe(
			true
		);
		expect(
			moveChangesRoster(onLeave, { kind: "backToShift", shiftId: "s" })
		).toBe(true);
	});
});

describe("rosterLeaveRefusal", () => {
	const problem = (status: number, errorCode: string): ApiProblemError =>
		new ApiProblemError({
			message: "Refused",
			status,
			errorCode,
			fieldErrors: [],
			retryAfterSeconds: undefined,
			reason: "http",
		});

	it("names an overlap and a refused key, and anything else as a failure", () => {
		expect(rosterLeaveRefusal(problem(409, "LEAVE_REQUEST_OVERLAPS"))).toBe(
			"overlaps"
		);
		expect(rosterLeaveRefusal(problem(403, "OWN_LEAVE_REVIEW_DENIED"))).toBe(
			"forbidden"
		);
		expect(rosterLeaveRefusal(problem(404, "MEMBER_NOT_FOUND"))).toBe(
			"forbidden"
		);
		expect(rosterLeaveRefusal(problem(500, "BOOM"))).toBe("failed");
		expect(rosterLeaveRefusal(new Error("offline"))).toBe("failed");
	});
});
