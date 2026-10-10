import type { Shift, ShiftRole } from "@/features/scheduling/shifts/api";
import { SHIFT_COLOURS } from "@/features/scheduling/shifts/shiftColours";
import type { Allocations } from "@/features/scheduling/scheduleDraft";

/*
 * API-shaped rows for stories and component tests; never sent anywhere.
 * Every shift belongs to schedule s-1 (see `schedules/fixtures.ts`).
 */

const role = (jobTitleId: string, name: string): ShiftRole => ({
	jobTitleId,
	name,
});

/** One shift as the API answers it; `shiftId` and `name` set it apart. */
export const shiftFixture = (
	overrides: Partial<Shift> & Pick<Shift, "shiftId" | "name">
): Shift => ({
	scheduleId: "s-1",
	included: true,
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

/** Schedule s-1's shifts as its list answers them: `INCLUDED_SHIFT_IDS` included, the rest not. */
export const scheduleShiftsFixture = (): Array<Shift> =>
	SHIFT_FIXTURES.map((shift) => ({
		...shift,
		included: INCLUDED_SHIFT_IDS.includes(shift.shiftId),
	}));

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
