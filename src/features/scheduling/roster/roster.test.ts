import { describe, expect, it } from "vitest";
import {
	hoursInDays,
	hoursOf,
	isoDateIn,
	legendOf,
	rosterFromAssignments,
	rosterStats,
	weekDays,
	type RosterCell,
} from "@/features/scheduling/roster/roster";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";

const period = { start: "2026-10-12", end: "2026-10-18" };

const week = [
	"2026-10-12",
	"2026-10-13",
	"2026-10-14",
	"2026-10-15",
	"2026-10-16",
	"2026-10-17",
	"2026-10-18",
];

const shiftCell = (start: string, end: string): RosterCell => ({
	kind: "shift",
	assignmentId: "a-1",
	shiftId: "sh-1",
	name: "Front Desk AM",
	group: "Front Desk",
	colour: "#E9A55A",
	start,
	end,
	role: "Front Desk Staff",
});

describe("rosterFromAssignments", () => {
	it("given_aThreeMemberWeek_when_mapped_then_givesThreeRowsOfSevenDays", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(rows.map((row) => row.name)).toEqual([
			"Aisha Rahman",
			"Ben Ong",
			"Chen Wei",
		]);
		rows.forEach((row) => {
			expect(Object.keys(row.days)).toEqual(week);
		});
		expect(rows[0]).toMatchObject({
			key: "m-1",
			membershipId: "m-1",
			jobTitle: "Front Desk Lead",
			employeeCode: "EMP-001",
		});
	});

	it("given_aWorkedDay_when_mapped_then_carriesTheFrozenShiftAndRole", () => {
		const [aisha] = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(aisha!.days["2026-10-12"]).toEqual({
			kind: "shift",
			assignmentId: "a-mp-1-2026-10-12",
			shiftId: "front-desk-am-copy",
			name: "Front Desk AM",
			group: "Front Desk",
			colour: "#E9A55A",
			start: "09:00",
			end: "15:00",
			role: "Front Desk Lead",
		});
	});

	it("given_offAndLeave_when_mapped_then_tellsThemApart", () => {
		const [, ben] = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(ben!.days["2026-10-14"]).toEqual({ kind: "leave" });
		expect(ben!.days["2026-10-15"]).toEqual({ kind: "leave" });
		expect(ben!.days["2026-10-18"]).toEqual({ kind: "off" });
	});

	it("given_leaveNamedByItsType_when_mapped_then_theLeaveCellCarriesTheName", () => {
		const named = scheduleAssignmentsFixture().map((assignment) =>
			assignment.offReason === "LEAVE"
				? { ...assignment, leaveTypeName: "Sick leave" }
				: assignment
		);

		const [, ben] = rosterFromAssignments(named, period);

		expect(ben!.days["2026-10-14"]).toEqual({
			kind: "leave",
			leaveTypeName: "Sick leave",
		});
		expect(ben!.days["2026-10-18"]).toEqual({ kind: "off" });
	});

	it("given_rowsWhoseMemberIsGone_when_mapped_then_keysEachByItsAssignment", () => {
		const [first, second] = scheduleAssignmentsFixture();
		const gone: Array<ScheduleAssignment> = [
			{ ...first!, assignmentId: "a-gone-1", member: null },
			{ ...second!, assignmentId: "a-gone-2", member: null },
		];

		const rows = rosterFromAssignments(gone, period);

		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			key: "a-gone-1",
			membershipId: null,
			name: null,
			jobTitle: null,
			employeeCode: null,
		});
		expect(Object.keys(rows[0]!.days)).toEqual(["2026-10-12"]);
		expect(rows[1]!.key).toBe("a-gone-2");
	});

	it("given_aRemovedMembership_when_mapped_then_keepsTheRowWithoutAName", () => {
		const [first] = scheduleAssignmentsFixture();
		const rows = rosterFromAssignments(
			[{ ...first!, member: { ...first!.member!, displayName: null } }],
			period
		);

		expect(rows[0]).toMatchObject({ key: "m-1", name: null });
	});

	it("given_aDayOutsideThePeriod_when_mapped_then_dropsIt", () => {
		const [first] = scheduleAssignmentsFixture();

		expect(
			rosterFromAssignments([{ ...first!, day: "2026-10-19" }], period)
		).toEqual([]);
	});
});

describe("hoursOf", () => {
	it.each([
		["a day shift", shiftCell("09:00", "15:00"), 6],
		["a shift ending on the half hour", shiftCell("09:00", "13:30"), 4.5],
		["a shift past midnight", shiftCell("23:00", "07:00"), 8],
		["a shift ending at midnight", shiftCell("16:00", "00:00"), 8],
		["a day off", { kind: "off" } as const, 0],
		["leave", { kind: "leave" } as const, 0],
		["no row for the day", undefined, 0],
	])("counts %s", (_, cell, hours) => {
		expect(hoursOf(cell)).toBe(hours);
	});

	it("given_aWeek_when_summed_then_addsEachDay", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(rows.map((row) => hoursInDays(row, week))).toEqual([30, 16, 48]);
	});
});

describe("isoDateIn", () => {
	const lateSundayInLondon = new Date("2026-10-18T20:00:00Z");

	it.each([
		["Asia/Singapore", "2026-10-19"],
		["Europe/London", "2026-10-18"],
		["America/Los_Angeles", "2026-10-18"],
	])("given_%s_when_asked_then_givesItsOwnDate", (timeZone, date) => {
		expect(isoDateIn(timeZone, lateSundayInLondon)).toBe(date);
	});

	it("given_anUnknownZone_when_asked_then_stillGivesADate", () => {
		expect(isoDateIn("Not/AZone", lateSundayInLondon)).toMatch(
			/^\d{4}-\d{2}-\d{2}$/
		);
	});
});

describe("weekDays", () => {
	it("given_oneOfThePeriodsWeeks_when_asked_then_givesItsSevenDays", () => {
		expect(
			weekDays({ start: "2026-10-12", end: "2026-10-25" }, "2026-10-19")
		).toEqual([
			"2026-10-19",
			"2026-10-20",
			"2026-10-21",
			"2026-10-22",
			"2026-10-23",
			"2026-10-24",
			"2026-10-25",
		]);
	});

	it("given_aWeekOutsideThePeriod_when_asked_then_givesTheFirstWeek", () => {
		expect(weekDays(period, "2026-11-02")).toEqual(week);
	});
});

describe("legendOf", () => {
	it("given_aWeek_when_keyed_then_listsOffLeaveAndEachShiftByGroupAndName", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(legendOf(rows)).toEqual([
			{ kind: "off" },
			{ kind: "leave" },
			{
				kind: "shift",
				shiftId: "front-desk-am-copy",
				name: "Front Desk AM",
				colour: "#E9A55A",
			},
			{
				kind: "shift",
				shiftId: "lunch-rush-copy",
				name: "Lunch Rush",
				colour: "#E9A55A",
			},
			{
				kind: "shift",
				shiftId: "swing-shift-copy",
				name: "Swing Shift",
				colour: "#E9A55A",
			},
		]);
	});

	it("given_noShifts_when_keyed_then_listsOffAndLeave", () => {
		expect(legendOf([])).toEqual([{ kind: "off" }, { kind: "leave" }]);
	});
});

describe("rosterStats", () => {
	it("given_aWeek_when_counted_then_countsStaffShiftsOffAndLeave", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(rosterStats(rows)).toEqual({
			staffRostered: 3,
			staffTotal: 3,
			shifts: 15,
			daysOff: 4,
			onLeave: 2,
		});
	});

	it("given_aMemberWithNoShift_when_counted_then_leavesThemOutOfRostered", () => {
		const rows = rosterFromAssignments(
			scheduleAssignmentsFixture().filter(
				(row) => row.member?.membershipId !== "m-2" || row.off
			),
			period
		);

		expect(rosterStats(rows)).toMatchObject({
			staffRostered: 2,
			staffTotal: 3,
		});
	});
});
