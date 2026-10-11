import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import type { Allocations, Shift } from "@/features/scheduling/scheduleDraft";
import type {
	DepartmentShift,
	ShiftRole,
} from "@/features/scheduling/shifts/api";
import { SHIFT_COLOURS } from "@/features/scheduling/shifts/shiftColours";

/*
 * API-shaped rows for stories and component tests; never sent anywhere.
 * Every shift is a live shift of "Front Office" (d-1), listed for its draft
 * schedule s-1 (see `schedules/fixtures.ts`).
 */

const role = (jobTitleId: string, name: string): ShiftRole => ({
	jobTitleId,
	name,
});

/** One row of a draft's shifts as the API answers it; `shiftId` and `name` set it apart. */
export const shiftFixture = (
	overrides: Partial<Shift> & Pick<Shift, "shiftId" | "name">
): Shift => ({
	included: true,
	frozen: false,
	group: "Front Desk",
	colour: SHIFT_COLOURS[2].value,
	startTime: "09:00",
	endTime: "15:00",
	days: ["MON", "TUE", "WED", "THU", "FRI"],
	roles: [role("front-desk-staff", "Front Desk Staff")],
	...overrides,
});

export const SHIFT_FIXTURES: Array<Shift> = [
	shiftFixture({
		shiftId: "front-desk-am",
		name: "Front Desk AM",
		roles: [
			role("front-desk-staff", "Front Desk Staff"),
			role("front-desk-lead", "Front Desk Lead"),
		],
	}),
	shiftFixture({
		shiftId: "breakfast-prep",
		name: "Breakfast Prep",
		group: "Kitchen",
		startTime: "06:00",
		endTime: "12:00",
		days: ["MON", "WED", "FRI", "SAT"],
		roles: [
			role("prep-cook", "Prep Cook"),
			role("pastry-assistant", "Pastry Assistant"),
		],
	}),
	shiftFixture({
		shiftId: "lunch-rush",
		name: "Lunch Rush",
		group: "Service",
		startTime: "11:00",
		endTime: "13:00",
		days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
		roles: [
			role("service-staff", "Service Staff"),
			role("cashier", "Cashier"),
			role("kitchen-runner", "Kitchen Runner"),
			role("supervisor", "Supervisor"),
		],
	}),
	shiftFixture({
		shiftId: "concierge-support",
		name: "Concierge Support",
		group: "Concierge",
		startTime: "10:00",
		endTime: "18:00",
		days: ["TUE", "WED", "THU"],
		roles: [role("concierge", "Concierge")],
	}),
	shiftFixture({
		shiftId: "swing-shift",
		name: "Swing Shift",
		group: "Service",
		startTime: "14:00",
		endTime: "22:00",
		roles: [
			role("closing-lead", "Closing Lead"),
			role("concierge", "Concierge"),
			role("duty-manager", "Duty Manager"),
		],
	}),
	shiftFixture({
		shiftId: "closing-crew",
		name: "Closing Crew",
		group: "Service",
		startTime: "16:00",
		endTime: "00:00",
		days: ["FRI", "SAT", "SUN"],
		roles: [
			role("closing-lead", "Closing Lead"),
			role("service-staff", "Service Staff"),
			role("supervisor", "Supervisor"),
		],
	}),
	shiftFixture({
		shiftId: "overnight-ops",
		name: "Overnight Ops",
		group: "Night",
		startTime: "23:00",
		endTime: "07:00",
		days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
		roles: [
			role("night-auditor", "Night Auditor"),
			role("security", "Security"),
		],
	}),
];

export const INCLUDED_SHIFT_IDS = [
	"front-desk-am",
	"breakfast-prep",
	"lunch-rush",
	"swing-shift",
];

/** Draft s-1's shifts as its list answers them: `INCLUDED_SHIFT_IDS` ticked, the rest not. */
export const scheduleShiftsFixture = (): Array<Shift> =>
	SHIFT_FIXTURES.map((shift) => ({
		...shift,
		included: INCLUDED_SHIFT_IDS.includes(shift.shiftId),
	}));

/**
 * A generated schedule's shifts: the frozen copies of what was ticked, one
 * of them (Breakfast Prep) since deleted from the department.
 */
export const frozenShiftsFixture = (): Array<ScheduleShift> =>
	SHIFT_FIXTURES.filter((shift) =>
		INCLUDED_SHIFT_IDS.includes(shift.shiftId)
	).map((shift) => ({
		...shift,
		shiftId: shift.shiftId === "breakfast-prep" ? null : shift.shiftId,
		included: true,
		frozen: true,
	}));

/** A live shift as the department's shift routes answer it. */
export const departmentShiftFixture = (
	shift: Shift = SHIFT_FIXTURES[0] as Shift
): DepartmentShift => ({
	shiftId: shift.shiftId,
	departmentId: "d-1",
	name: shift.name,
	group: shift.group,
	colour: shift.colour,
	startTime: shift.startTime,
	endTime: shift.endTime,
	days: shift.days,
	roles: shift.roles,
});

/** Front Office's active job titles, as the shift dialog offers them. */
export const SHIFT_ROLE_OPTIONS: Array<ShiftRole> = [
	role("front-desk-staff", "Front Desk Staff"),
	role("front-desk-lead", "Front Desk Lead"),
];

/** Allocations for the included shifts; Breakfast Prep's pastry assistant has nobody yet. */
export const ALLOCATION_FIXTURES: Allocations = {
	"front-desk-am": { "front-desk-staff": 3, "front-desk-lead": 1 },
	"breakfast-prep": { "prep-cook": 2, "pastry-assistant": 0 },
	"lunch-rush": {
		"service-staff": 4,
		cashier: 1,
		"kitchen-runner": 1,
		supervisor: 1,
	},
	"swing-shift": { "closing-lead": 2, concierge: 2, "duty-manager": 1 },
};
