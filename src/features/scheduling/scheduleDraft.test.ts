import { describe, expect, it } from "vitest";
import {
	allocationStatus,
	autoFillDemand,
	demandLevel,
	isWeekdays,
	rolesOf,
	scheduleDraftReducer,
	seedScheduleDraft,
	shiftHours,
	slotsOf,
	summarise,
	type Shift,
} from "@/features/scheduling/scheduleDraft";

const shift = (overrides: Partial<Shift> = {}): Shift => ({
	shiftId: "s-1",
	name: "Front Desk AM",
	start: "09:00",
	end: "15:00",
	days: ["MON"],
	staffNeeded: 4,
	roles: [
		{ roleId: "staff", name: "Front Desk Staff", allocated: 3 },
		{ roleId: "lead", name: "Front Desk Lead", allocated: 1 },
	],
	...overrides,
});

const setup = {
	departmentId: "d-1",
	name: "Front Office – Week 16",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
};

describe("shift calculations", () => {
	it.each([
		["09:00", "15:00", 6],
		["11:00", "13:00", 2],
		["16:00", "00:00", 8],
		["23:00", "07:00", 8],
		["06:00", "06:00", 24],
	])(
		"given_%s_to_%s_when_measured_then_lasts_%i_hours",
		(start, end, hours) => {
			expect(shiftHours({ start, end })).toBe(hours);
		}
	);

	it("given_allocations_when_compared_with_theNeed_then_reportCompleteShortOrOver", () => {
		expect(allocationStatus(shift())).toBe("complete");
		expect(allocationStatus(shift({ staffNeeded: 5 }))).toBe("short");
		expect(allocationStatus(shift({ staffNeeded: 3 }))).toBe("over");
	});

	it("given_days_when_checked_then_onlyMondayToFridayCountsAsWeekdays", () => {
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "FRI"])).toBe(true);
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "SAT"])).toBe(false);
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "FRI", "SAT"])).toBe(false);
	});

	it("given_shiftsSharingARole_when_listed_then_eachRoleAppearsOnceInFirstOrder", () => {
		const roles = rolesOf([
			shift(),
			shift({
				shiftId: "s-2",
				roles: [
					{ roleId: "lead", name: "Front Desk Lead", allocated: 2 },
					{ roleId: "cashier", name: "Cashier", allocated: 1 },
				],
			}),
		]);

		expect(roles.map((role) => role.roleId)).toEqual([
			"staff",
			"lead",
			"cashier",
		]);
	});
});

describe("time blocks", () => {
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
		const demand = autoFillDemand([
			shift(),
			shift({
				shiftId: "s-2",
				start: "14:00",
				end: "22:00",
				roles: [{ roleId: "lead", name: "Front Desk Lead", allocated: 2 }],
			}),
		]);

		expect(demand["08:30"]).toEqual({});
		expect(demand["09:00"]).toEqual({ staff: 3, lead: 1 });
		expect(demand["14:30"]).toEqual({ staff: 3, lead: 3 });
		expect(demand["15:00"]).toEqual({ lead: 2 });
		expect(demand["21:30"]).toEqual({ lead: 2 });
	});
});

describe("summarise", () => {
	it("given_theSeed_when_summarised_then_countsIncludedShiftsAndCappedCoverage", () => {
		// Lunch Rush allocates 7 of 6, which counts as a conflict but fills only 6.
		expect(summarise(seedScheduleDraft())).toEqual({
			shifts: 4,
			roles: 18,
			coverage: 94,
			conflicts: 1,
		});
	});

	it("given_noShifts_when_summarised_then_coverageIsZero", () => {
		const draft = { ...seedScheduleDraft(), includedShiftIds: [] };

		expect(summarise(draft)).toEqual({
			shifts: 0,
			roles: 0,
			coverage: 0,
			conflicts: 0,
		});
	});
});

describe("scheduleDraftReducer", () => {
	it("given_setup_when_saved_then_keepsItAndOpensTheNextStep", () => {
		const draft = scheduleDraftReducer(seedScheduleDraft(), {
			type: "setupSaved",
			setup,
		});

		expect(draft.setup).toEqual(setup);
		expect(draft.reached).toBe(1);
	});

	it("given_aLaterStepReached_when_anEarlierOneIsReached_then_keepsTheFurthest", () => {
		const reached = scheduleDraftReducer(seedScheduleDraft(), {
			type: "stepReached",
			step: 3,
		});

		expect(
			scheduleDraftReducer(reached, { type: "stepReached", step: 1 }).reached
		).toBe(3);
	});

	it("given_anIncludedShift_when_deleted_then_leavesTheListAndTheSelection", () => {
		const draft = scheduleDraftReducer(seedScheduleDraft(), {
			type: "shiftDeleted",
			shiftId: "front-desk-am",
		});

		expect(draft.shifts.map((item) => item.shiftId)).not.toContain(
			"front-desk-am"
		);
		expect(draft.includedShiftIds).not.toContain("front-desk-am");
	});

	it("given_anIncludedConstraint_when_deleted_then_leavesTheListAndTheSelection", () => {
		const draft = scheduleDraftReducer(seedScheduleDraft(), {
			type: "constraintDeleted",
			constraintId: "required-role-coverage",
		});

		expect(draft.constraints).toHaveLength(5);
		expect(draft.includedConstraintIds).toEqual(["minimum-shift-staffing"]);
	});

	it("given_anAllocation_when_changed_then_updatesOnlyThatRoleAndNeverBelowZero", () => {
		const raised = scheduleDraftReducer(seedScheduleDraft(), {
			type: "allocationChanged",
			shiftId: "breakfast-prep",
			roleId: "pastry-assistant",
			allocated: 1,
		});
		const lowered = scheduleDraftReducer(raised, {
			type: "allocationChanged",
			shiftId: "breakfast-prep",
			roleId: "prep-cook",
			allocated: -1,
		});

		const roles = lowered.shifts.find(
			(item) => item.shiftId === "breakfast-prep"
		)?.roles;
		expect(roles).toEqual([
			{ roleId: "prep-cook", name: "Prep Cook", allocated: 0 },
			{ roleId: "pastry-assistant", name: "Pastry Assistant", allocated: 1 },
		]);
	});

	it("given_demand_when_changed_then_keepsTheSlotsOtherRoles", () => {
		const first = scheduleDraftReducer(seedScheduleDraft(), {
			type: "demandChanged",
			slotStart: "06:00",
			roleId: "cashier",
			staff: 2,
		});
		const second = scheduleDraftReducer(first, {
			type: "demandChanged",
			slotStart: "06:00",
			roleId: "prep-cook",
			staff: 4,
		});

		expect(second.demand["06:00"]).toEqual({ cashier: 2, "prep-cook": 4 });
	});

	it("given_includedShifts_when_autoFilled_then_ignoresExcludedOnes", () => {
		const draft = scheduleDraftReducer(seedScheduleDraft(), {
			type: "demandAutoFilled",
		});

		// Overnight Ops is not included, so nobody is wanted before breakfast prep.
		expect(draft.demand["06:00"]).toEqual({
			"prep-cook": 2,
			"pastry-assistant": 0,
		});
	});
});
