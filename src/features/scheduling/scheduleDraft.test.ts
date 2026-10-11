import { describe, expect, it } from "vitest";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	ALLOCATION_FIXTURES,
	INCLUDED_SHIFT_IDS,
	SHIFT_FIXTURES,
	frozenShiftsFixture,
	shiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import {
	autoFillDemand,
	demandLevel,
	emptyScheduleDraft,
	includedShifts,
	isFrozen,
	isWeekdays,
	rolesOf,
	scheduleDraftReducer,
	shiftHours,
	shiftRowsOf,
	slotsOf,
	summarise,
	tickedOf,
	timeSteps,
	type ScheduleDraft,
} from "@/features/scheduling/scheduleDraft";

const shift = shiftFixture({
	shiftId: "s-1",
	name: "Front Desk AM",
	days: ["MON"],
	roles: [
		{ jobTitleId: "staff", name: "Front Desk Staff" },
		{ jobTitleId: "lead", name: "Front Desk Lead" },
	],
});

const allocations = { "s-1": { staff: 3, lead: 1 } };

const setup = {
	departmentId: "d-1",
	name: "Front Office - Week 16",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
};

/** The fixture shifts chosen and allocated, as the Forecast step leaves them. */
const chosen = (): ScheduleDraft => ({
	...emptyScheduleDraft(),
	setup,
	includedShiftIds: INCLUDED_SHIFT_IDS,
	allocations: ALLOCATION_FIXTURES,
});

describe("shift calculations", () => {
	it.each([
		["09:00", "15:00", 6],
		["11:00", "13:00", 2],
		["16:00", "00:00", 8],
		["23:00", "07:00", 8],
		["06:00", "06:00", 24],
	])(
		"given_%s_to_%s_when_measured_then_lasts_%i_hours",
		(startTime, endTime, hours) => {
			expect(shiftHours({ startTime, endTime })).toBe(hours);
		}
	);

	it("given_days_when_checked_then_onlyMondayToFridayCountsAsWeekdays", () => {
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "FRI"])).toBe(true);
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "SAT"])).toBe(false);
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "FRI", "SAT"])).toBe(false);
	});

	it("given_shiftsSharingARole_when_listed_then_eachRoleAppearsOnceInFirstOrder", () => {
		const roles = rolesOf([
			shift,
			shiftFixture({
				shiftId: "s-2",
				name: "Front Desk PM",
				roles: [
					{ jobTitleId: "lead", name: "Front Desk Lead" },
					{ jobTitleId: "cashier", name: "Cashier" },
				],
			}),
		]);

		expect(roles.map((role) => role.jobTitleId)).toEqual([
			"staff",
			"lead",
			"cashier",
		]);
	});
});

describe("time blocks", () => {
	it("given_theDay_when_stepped_then_offersEveryHalfHourFromMidnight", () => {
		const times = timeSteps();

		expect(times).toHaveLength(48);
		expect(times.slice(0, 3)).toEqual(["00:00", "00:30", "01:00"]);
		expect(times[47]).toBe("23:30");
	});

	it("given_aGroup_when_sliced_then_givesHalfHourSlots", () => {
		expect(slotsOf({ start: "06:00", end: "07:30" })).toEqual([
			{ start: "06:00", end: "06:30" },
			{ start: "06:30", end: "07:00" },
			{ start: "07:00", end: "07:30" },
		]);
	});

	it.each([
		[0, "none"],
		[1, "low"],
		[2, "low"],
		[3, "medium"],
		[5, "medium"],
		[6, "high"],
	] as const)("given_%i_staff_when_shaded_then_is_%s", (staff, level) => {
		expect(demandLevel(staff)).toBe(level);
	});

	it("given_shifts_when_autoFilled_then_eachSlotAddsTheShiftsRunningThen", () => {
		const demand = autoFillDemand(
			[
				shift,
				shiftFixture({
					shiftId: "s-2",
					name: "Front Desk PM",
					startTime: "14:00",
					endTime: "22:00",
					roles: [{ jobTitleId: "lead", name: "Front Desk Lead" }],
				}),
			],
			{ ...allocations, "s-2": { lead: 2 } }
		);

		expect(demand["08:30"]).toEqual({});
		expect(demand["09:00"]).toEqual({ staff: 3, lead: 1 });
		expect(demand["14:30"]).toEqual({ staff: 3, lead: 3 });
		expect(demand["15:00"]).toEqual({ lead: 2 });
		expect(demand["21:30"]).toEqual({ lead: 2 });
	});
});

describe("summarise", () => {
	it("given_theChosenShifts_when_summarised_then_countsDistinctRolesAndFilledPositions", () => {
		// Eleven shift roles across the four shifts; only the pastry assistant has nobody.
		expect(
			summarise(includedShifts(chosen(), SHIFT_FIXTURES), ALLOCATION_FIXTURES)
		).toEqual({
			shifts: 4,
			roles: 11,
			coverage: 91,
		});
	});

	it("given_noShifts_when_summarised_then_coverageIsZero", () => {
		expect(summarise([], {})).toEqual({ shifts: 0, roles: 0, coverage: 0 });
	});
});

describe("scheduleDraftReducer", () => {
	it("given_setup_when_saved_then_keepsWhatIsChosen", () => {
		const draft = scheduleDraftReducer(chosen(), {
			type: "setupSaved",
			setup: { ...setup, name: "Week 43" },
		});

		expect(draft.setup).toEqual({ ...setup, name: "Week 43" });
		expect(draft.includedShiftIds).toEqual(chosen().includedShiftIds);
		expect(draft.allocations).toEqual(chosen().allocations);
	});

	it("given_aSchedule_when_loaded_then_startsFromItsSetupAndItsTicks", () => {
		const draft = scheduleDraftReducer(chosen(), {
			type: "scheduleLoaded",
			schedule: scheduleFixture(),
		});

		expect(draft.setup).toEqual({
			departmentId: "d-1",
			name: "Front Office - Week 42",
			periodStart: "2026-10-12",
			includeLeave: true,
			allowOpenShifts: false,
		});
		expect(draft.saved).toEqual({
			scheduleId: "s-1",
			branchId: "b-1",
			branchName: "Main branch",
			departmentId: "d-1",
			departmentName: "Front Office",
			status: "DRAFT",
		});
		// Until the shifts load, the ticks are the ones the schedule keeps.
		expect(draft.includedShiftIds).toEqual(scheduleFixture().includedShiftIds);
		expect(draft.shiftsSeeded).toBe(false);
		expect(draft.allocations).toEqual({});
	});

	it("given_aLoadedSchedule_when_itsShiftsLoad_then_ticksTheIncludedOnesOnce", () => {
		const loaded = scheduleDraftReducer(emptyScheduleDraft(), {
			type: "scheduleLoaded",
			schedule: scheduleFixture(),
		});
		const shifts = SHIFT_FIXTURES.map((shift) => ({
			...shift,
			included: shift.shiftId === "lunch-rush",
		}));

		const seeded = scheduleDraftReducer(loaded, {
			type: "shiftsLoaded",
			shifts,
		});
		const ticked = scheduleDraftReducer(seeded, {
			type: "shiftsIncluded",
			shiftIds: ["lunch-rush", "swing-shift"],
		});
		// A reload of the same shifts keeps what the person ticked since.
		const reloaded = scheduleDraftReducer(ticked, {
			type: "shiftsLoaded",
			shifts,
		});

		expect(seeded.includedShiftIds).toEqual(["lunch-rush"]);
		expect(reloaded.includedShiftIds).toEqual(["lunch-rush", "swing-shift"]);
	});

	it("given_anIncludedShift_when_removed_then_leavesTheSelectionAndItsAllocations", () => {
		const draft = scheduleDraftReducer(chosen(), {
			type: "shiftRemoved",
			shiftId: "front-desk-am",
		});

		expect(draft.includedShiftIds).not.toContain("front-desk-am");
		expect(draft.allocations["front-desk-am"]).toBeUndefined();
		expect(draft.allocations["lunch-rush"]).toBeDefined();
	});

	it("given_anIncludedConstraint_when_deleted_then_leavesTheListAndTheSelection", () => {
		const draft = scheduleDraftReducer(chosen(), {
			type: "constraintDeleted",
			constraintId: "required-role-coverage",
		});

		expect(draft.constraints).toHaveLength(5);
		expect(draft.includedConstraintIds).toEqual(["minimum-shift-staffing"]);
	});

	it("given_anAllocation_when_changed_then_updatesOnlyThatRoleAndNeverBelowZero", () => {
		const raised = scheduleDraftReducer(chosen(), {
			type: "allocationChanged",
			shiftId: "breakfast-prep",
			jobTitleId: "pastry-assistant",
			allocated: 1,
		});
		const lowered = scheduleDraftReducer(raised, {
			type: "allocationChanged",
			shiftId: "breakfast-prep",
			jobTitleId: "prep-cook",
			allocated: -1,
		});

		expect(lowered.allocations["breakfast-prep"]).toEqual({
			"prep-cook": 0,
			"pastry-assistant": 1,
		});
	});

	it("given_demand_when_changed_then_keepsTheSlotsOtherRoles", () => {
		const first = scheduleDraftReducer(emptyScheduleDraft(), {
			type: "demandChanged",
			slotStart: "06:00",
			jobTitleId: "cashier",
			staff: 2,
		});
		const second = scheduleDraftReducer(first, {
			type: "demandChanged",
			slotStart: "06:00",
			jobTitleId: "prep-cook",
			staff: 4,
		});

		expect(second.demand["06:00"]).toEqual({ cashier: 2, "prep-cook": 4 });
	});

	it("given_includedShifts_when_autoFilled_then_ignoresExcludedOnes", () => {
		const draft = scheduleDraftReducer(chosen(), {
			type: "demandAutoFilled",
			shifts: SHIFT_FIXTURES,
		});

		// Overnight Ops is not included, so nobody is wanted before breakfast prep.
		expect(draft.demand["06:00"]).toEqual({
			"prep-cook": 2,
			"pastry-assistant": 0,
		});
	});
});

describe("frozen schedules and ticks", () => {
	it("given_aStatus_when_asked_then_onlyADraftIsNotFrozen", () => {
		expect(isFrozen({ status: "DRAFT" })).toBe(false);
		expect(isFrozen({ status: "GENERATION_REQUESTED" })).toBe(true);
		const loaded = scheduleDraftReducer(emptyScheduleDraft(), {
			type: "scheduleLoaded",
			schedule: generatedScheduleFixture(),
		});
		expect(loaded.saved?.status).toBe("GENERATION_REQUESTED");
	});

	it("given_aFrozenCopyWhoseSourceWasDeleted_when_listed_then_itGetsALocalId", () => {
		const rows = shiftRowsOf(frozenShiftsFixture());

		expect(rows.map((row) => row.shiftId)).toEqual([
			"front-desk-am",
			"frozen-1",
			"lunch-rush",
			"swing-shift",
		]);
	});

	it("given_ticksForShiftsNoLongerListed_when_read_then_onlyListedOnesRemain", () => {
		const draft = { includedShiftIds: ["front-desk-am", "deleted-shift"] };

		expect(tickedOf(draft, SHIFT_FIXTURES)).toEqual(["front-desk-am"]);
		// Before the shifts are listed, the ticks are taken as they are.
		expect(tickedOf(draft, undefined)).toEqual([
			"front-desk-am",
			"deleted-shift",
		]);
	});
});
