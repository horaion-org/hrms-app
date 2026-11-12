import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	dayWithoutShiftPlainText,
	dayWithoutShiftTileText,
	hoursInDays,
	hoursOf,
	isoDateIn,
	legendOf,
	rosterFromAssignments,
	rosterStats,
	weekDays,
	type RosterCell,
	type RosterRow,
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

const shiftCell = (
	start: string,
	end: string,
	unpaidBreakMinutes = 0
): RosterCell => ({
	kind: "shift",
	assignmentId: "a-1",
	shiftId: "sh-1",
	name: "Front Desk AM",
	group: "Front Desk",
	colour: "#E9A55A",
	start,
	end,
	unpaidBreakMinutes,
	carriesOvertime: false,
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
			unpaidBreakMinutes: 0,
			carriesOvertime: false,
			role: "Front Desk Lead",
		});
	});

	it("given_offLeaveAndAbsent_when_mapped_then_tellsThemApart", () => {
		const [aisha, ben] = rosterFromAssignments(
			scheduleAssignmentsFixture(),
			period
		);

		expect(ben!.days["2026-10-14"]).toEqual({ kind: "leave" });
		expect(ben!.days["2026-10-15"]).toEqual({ kind: "leave" });
		expect(ben!.days["2026-10-18"]).toEqual({ kind: "absent" });
		expect(aisha!.days["2026-10-17"]).toEqual({ kind: "off", dayType: "OFF" });
		expect(aisha!.days["2026-10-18"]).toEqual({
			kind: "off",
			dayType: "REST",
		});
	});

	it("given_aNonWorkingDayWithoutAType_when_mapped_then_isOffWithANullType", () => {
		const [first] = scheduleAssignmentsFixture();
		const [row] = rosterFromAssignments(
			[
				{
					...first!,
					off: true,
					offReason: "OFF",
					dayType: null,
					shift: null,
					jobTitle: null,
				},
			],
			period
		);

		expect(row!.days["2026-10-12"]).toEqual({ kind: "off", dayType: null });
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
		expect(ben!.days["2026-10-18"]).toEqual({ kind: "absent" });
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
		["only the paid part of a shift", shiftCell("07:00", "19:00", 60), 11],
		["a day off", { kind: "off", dayType: "OFF" } as const, 0],
		["an absent day", { kind: "absent" } as const, 0],
		["leave", { kind: "leave" } as const, 0],
		["no row for the day", undefined, 0],
	])("counts %s", (_, cell, hours) => {
		expect(hoursOf(cell)).toBe(hours);
	});

	it("given_aWeek_when_summed_then_addsEachDay", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(rows.map((row) => hoursInDays(row, week))).toEqual([30, 16, 48]);
	});

	it.each([
		["three 8 h shifts with a 20-minute break", "09:00", "17:00", 20, 3, 23],
		["six 12 h shifts with a 50-minute break", "07:00", "19:00", 50, 6, 67],
		["five 8 h shifts with a 20-minute break", "09:00", "17:00", 20, 5, 38.33],
	])(
		"given_%s_when_summed_then_roundsOnceLikeTheExport",
		(_, start, end, unpaidBreakMinutes, shifts, hours) => {
			const days = week.slice(0, shifts);
			const row = {
				days: Object.fromEntries(
					days.map((day) => [day, shiftCell(start, end, unpaidBreakMinutes)])
				),
			} as RosterRow;

			expect(hoursInDays(row, days)).toBe(hours);
		}
	);
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
	it("given_aWeek_when_keyed_then_listsEachDayTypeAbsentLeaveAndEachShiftByGroupAndName", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		expect(legendOf(rows)).toEqual([
			{ kind: "off", dayType: "OFF" },
			{ kind: "off", dayType: "REST" },
			{ kind: "absent" },
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

	it("given_noRows_when_keyed_then_listsLeaveOnly", () => {
		expect(legendOf([])).toEqual([{ kind: "leave" }]);
	});

	it("given_typesMetInAnyOrder_when_keyed_then_listsEachOnceByCodeWithNoTypeFirst", () => {
		const rows: Array<RosterRow> = [
			{
				key: "m-1",
				membershipId: "m-1",
				name: "Aisha Rahman",
				jobTitle: null,
				employeeCode: null,
				days: {
					"2026-10-12": { kind: "off", dayType: "REST" },
					"2026-10-13": { kind: "off", dayType: "PUBLIC_HOLIDAY_OFF" },
					"2026-10-14": { kind: "off", dayType: null },
					"2026-10-15": { kind: "off", dayType: "REST" },
				},
			},
		];

		expect(legendOf(rows)).toEqual([
			{ kind: "off", dayType: null },
			{ kind: "off", dayType: "PUBLIC_HOLIDAY_OFF" },
			{ kind: "off", dayType: "REST" },
			{ kind: "leave" },
		]);
	});
});

describe("a day without a shift in words", () => {
	let t: TFunction;
	beforeAll(async () => {
		const i18n = createInstance();
		await i18n.init({ lng: "en", resources: { en: { translation: en } } });
		t = i18n.t;
	});

	it.each([
		["a rest day", { kind: "off", dayType: "REST" }, "Rest day", "Rest day"],
		["a day off", { kind: "off", dayType: "OFF" }, "Day off", "Day off"],
		[
			"a type added later",
			{ kind: "off", dayType: "PUBLIC_HOLIDAY_OFF" },
			"Public holiday off",
			"Public holiday off",
		],
		[
			"a non-working day without a type",
			{ kind: "off", dayType: null },
			"OFF",
			"Day off",
		],
		["an absent day", { kind: "absent" }, "Absent", "Absent"],
		["leave", { kind: "leave" }, "LEAVE", "On leave"],
		[
			"leave named by its type",
			{ kind: "leave", leaveTypeName: "Sick leave" },
			"Sick leave",
			"Sick leave",
		],
	] as const)("writes %s", (_, cell, tile, plain) => {
		expect(dayWithoutShiftTileText(cell, t)).toBe(tile);
		expect(dayWithoutShiftPlainText(cell, t)).toBe(plain);
	});
});

describe("rosterStats", () => {
	it("given_aWeek_when_counted_then_countsEveryNonWorkingDayAsOffAndAbsentAsNeither", () => {
		const rows = rosterFromAssignments(scheduleAssignmentsFixture(), period);

		// Aisha's day off and rest day, and Chen's day off; Ben's absent Sunday counts in neither.
		expect(rosterStats(rows)).toEqual({
			staffRostered: 3,
			staffTotal: 3,
			shifts: 15,
			daysOff: 3,
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

describe("day notes", () => {
	const shift = {
		shiftId: "s1",
		name: "Morning",
		group: "Day",
		colour: "#112233",
		startTime: "09:00",
		endTime: "17:00",
		unpaidBreakMinutes: 0,
		carriesOvertime: false,
	};
	const assignment = {
		assignmentId: "a1",
		member: {
			membershipId: "m1",
			memberProfileId: "p1",
			displayName: "Alex Tan",
			employeeCode: "E1",
			jobTitleName: null,
			partTime: false,
		},
		day: "2026-11-02",
		off: false,
		offReason: null,
		dayType: null,
		shift,
		jobTitle: { jobTitleId: "j1", name: "Clerk" },
	} as const;
	const period = { start: "2026-11-02", end: "2026-11-08" };

	it("leaves a day with nothing to add without a note", () => {
		const [row] = rosterFromAssignments([assignment], period);
		expect(row?.days["2026-11-02"]).not.toHaveProperty("note");
	});

	it.each(["REST", "OFF"])(
		"notes the %s day type a shift falls on",
		(dayType) => {
			const [row] = rosterFromAssignments([{ ...assignment, dayType }], period);
			expect(row?.days["2026-11-02"]?.note).toEqual({ dayType });
		}
	);

	it("leaves the type of a day not worked to its cell, not a note", () => {
		const [row] = rosterFromAssignments(
			[
				{
					...assignment,
					off: true,
					offReason: "OFF",
					dayType: "REST",
					shift: null,
					jobTitle: null,
				},
			],
			period
		);
		expect(row?.days["2026-11-02"]).toEqual({ kind: "off", dayType: "REST" });
	});

	it("carries the flag, the request and the short shift", () => {
		const [row] = rosterFromAssignments(
			[
				{
					...assignment,
					flag: "ON_LEAVE_WHILE_ROSTERED",
					leaveRequestId: "r1",
					leaveTypeName: "Annual leave",
					uncoveredShift: shift,
				},
			],
			period
		);
		expect(row?.days["2026-11-02"]?.note).toEqual({
			flag: "ON_LEAVE_WHILE_ROSTERED",
			leaveRequestId: "r1",
			leaveTypeName: "Annual leave",
			uncoveredShiftName: "Morning",
		});
	});
});
