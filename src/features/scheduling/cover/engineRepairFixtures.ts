import type {
	NotAssignedPerson,
	RepairMove,
	RepairOption,
	RepairOptions,
	RepairPerson,
} from "@/features/scheduling/cover/engineRepairApi";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";
import { shiftCopyId } from "@/features/scheduling/shifts/fixtures";

/*
 * API-shaped engine repair answers for stories and tests; never sent
 * anywhere. Schedule s-1's Front Desk AM is one short on Saturday 17 October
 * (`schedules/fixtures.ts`): Aisha Rahman (m-1) is off that day and rests on
 * Sunday, Ben Ong (m-2, part-time) works Lunch Rush, and Chen Wei (m-3) works
 * the Swing Shift. One option of each kind the API sends, in its shape.
 */

const FRIDAY = "2026-10-16";
const SATURDAY = "2026-10-17";
const SUNDAY = "2026-10-18";
const FRONT_DESK_AM = shiftCopyId("front-desk-am");
const LUNCH_RUSH = shiftCopyId("lunch-rush");
const SWING_SHIFT = shiftCopyId("swing-shift");
const MORNING = {
	start: "2026-10-17T09:00:00",
	end: "2026-10-17T15:00:00",
};

/** Aisha, off that day, called in for Front Desk AM. */
export const callInMove = (
	overrides: Partial<RepairMove> = {}
): RepairMove => ({
	kind: "CALL_IN",
	membershipId: "m-1",
	displayName: "Aisha Rahman",
	fromShiftId: null,
	fromShiftName: null,
	fromDate: null,
	shiftId: FRONT_DESK_AM,
	shiftName: "Front Desk AM",
	date: SATURDAY,
	period: MORNING,
	extensionMinutes: null,
	...overrides,
});

/** Ben moved from the swing shift to Front Desk AM the same day. */
export const reassignMove = (
	overrides: Partial<RepairMove> = {}
): RepairMove => ({
	kind: "REASSIGN",
	membershipId: "m-2",
	displayName: "Ben Ong",
	fromShiftId: SWING_SHIFT,
	fromShiftName: "Swing Shift",
	fromDate: SATURDAY,
	shiftId: FRONT_DESK_AM,
	shiftName: "Front Desk AM",
	date: SATURDAY,
	period: MORNING,
	extensionMinutes: null,
	...overrides,
});

/** Chen stays on two hours after the swing shift, until 15:00. */
export const stretchMove = (
	overrides: Partial<RepairMove> = {}
): RepairMove => ({
	kind: "OVERTIME_EXTENSION",
	membershipId: "m-3",
	displayName: "Chen Wei",
	fromShiftId: null,
	fromShiftName: null,
	fromDate: null,
	shiftId: SWING_SHIFT,
	shiftName: "Swing Shift",
	date: SATURDAY,
	period: { start: "2026-10-17T13:00:00", end: "2026-10-17T15:00:00" },
	extensionMinutes: 120,
	side: "AFTER_SHIFT",
	...overrides,
});

/** No extra minutes of any kind. */
const NO_EXTRA_MINUTES = {
	overtime: 0,
	restDayWork: 0,
	timeOffEarned: 0,
	pastContract: 0,
};

/** A feasible option with the given moves: a call-in that fills the gap, checked against the rules. */
export const feasibleRepair = (
	moves: Array<RepairMove> = [callInMove()],
	overrides: Partial<RepairOption> = {}
): RepairOption => ({
	feasible: true,
	workingTimeRulesChecked: false,
	moves,
	summary: "Call in Aisha Rahman for Front Desk AM",
	infeasibleReason: null,
	leftShort: [],
	leftShortBy: null,
	warnings: [],
	kind: "CALL_IN",
	fills: "GAP",
	stillShort: [],
	extraMinutes: NO_EXTRA_MINUTES,
	cells: [],
	people: [],
	...overrides,
});

/**
 * Chen's stretch after the swing shift fills the gap's last two hours,
 * 13:00 to 15:00; 09:00 to 13:00 is still one short (the engine's ADR-0036).
 */
export const partStretchRepair = (): RepairOption =>
	feasibleRepair([stretchMove()], {
		kind: "OVERTIME_STRETCH",
		fills: "PART",
		workingTimeRulesChecked: true,
		leftShort: [{ start: "2026-10-17T09:00:00", end: "2026-10-17T13:00:00" }],
		leftShortBy: 1,
		stillShort: [
			{ start: "2026-10-17T09:00:00", end: "2026-10-17T13:00:00", shortBy: 1 },
		],
	});

/** The engine's honest no for a staffing gap as generated. */
export const infeasibleRepair = (): RepairOption => ({
	...feasibleRepair([]),
	feasible: false,
	summary: null,
	infeasibleReason: "Moving anyone would leave another shift short.",
	leftShort: [MORNING],
	leftShortBy: 1,
	kind: "OTHER",
	fills: null,
	stillShort: [{ ...MORNING, shortBy: 1 }],
	extraMinutes: null,
});

/** A person an option changes, with their week before and after it. */
const person = (
	membershipId: string,
	displayName: string,
	weekMinutes: RepairPerson["weekMinutes"]
): RepairPerson => ({ membershipId, displayName, weekMinutes });

const AISHA = "m-1";
const BEN = "m-2";
const CHEN = "m-3";

/** A WORK cell of one of the fixture's people. */
const workCell = (
	membershipId: string,
	day: string,
	shiftId: string,
	stretch: { stretchBeforeMinutes?: number; stretchAfterMinutes?: number } = {}
): RosterChangeCell => ({
	membershipId,
	day,
	kind: "WORK",
	shiftId,
	...stretch,
});

/** An option of the API's shape: what the app reads, with the older fields it no longer reads left plain. */
const repairOption = (option: {
	kind: RepairOption["kind"];
	cells: Array<RosterChangeCell>;
	people: Array<RepairPerson>;
	fills?: RepairOption["fills"];
	stillShort?: RepairOption["stillShort"];
	extraMinutes?: Partial<NonNullable<RepairOption["extraMinutes"]>>;
	workingTimeRulesChecked?: boolean;
}): RepairOption => ({
	...feasibleRepair([]),
	summary: null,
	workingTimeRulesChecked: option.workingTimeRulesChecked ?? true,
	kind: option.kind,
	fills: option.fills ?? "GAP",
	stillShort: option.stillShort ?? [],
	extraMinutes: { ...NO_EXTRA_MINUTES, ...option.extraMinutes },
	cells: option.cells,
	people: option.people,
});

/** Aisha comes in on her day off, within her hours. */
export const callInOption = (
	overrides: Partial<RepairOption> = {}
): RepairOption => ({
	...repairOption({
		kind: "CALL_IN",
		cells: [workCell(AISHA, SATURDAY, FRONT_DESK_AM)],
		people: [
			person(AISHA, "Aisha Rahman", {
				before: 1800,
				after: 2160,
				contract: 2640,
			}),
		],
	}),
	...overrides,
});

/** Aisha comes in on her Sunday rest day: six hours on a rest day, and as much time off earned. */
export const restDayCallInOption = (): RepairOption =>
	repairOption({
		kind: "CALL_IN",
		cells: [workCell(AISHA, SUNDAY, FRONT_DESK_AM)],
		people: [
			person(AISHA, "Aisha Rahman", {
				before: 1800,
				after: 2160,
				contract: 2640,
			}),
		],
		extraMinutes: { restDayWork: 360, timeOffEarned: 360 },
	});

/** Ben moves from Lunch Rush to Front Desk AM the same day; a part-timer, he goes two hours past his contract. */
export const moveOption = (): RepairOption =>
	repairOption({
		kind: "MOVE",
		cells: [workCell(BEN, SATURDAY, FRONT_DESK_AM)],
		people: [
			person(BEN, "Ben Ong", { before: 1200, after: 1440, contract: 1320 }),
		],
		extraMinutes: { pastContract: 120 },
	});

/** Ben stays on two hours after Lunch Rush; 09:00 to 11:00 is still one short. */
export const stretchAfterOption = (): RepairOption =>
	repairOption({
		kind: "OVERTIME_STRETCH",
		fills: "PART",
		cells: [workCell(BEN, SATURDAY, LUNCH_RUSH, { stretchAfterMinutes: 120 })],
		people: [
			person(BEN, "Ben Ong", { before: 1200, after: 1320, contract: 1320 }),
		],
		stillShort: [
			{ start: "2026-10-17T09:00:00", end: "2026-10-17T11:00:00", shortBy: 1 },
		],
		extraMinutes: { overtime: 120 },
	});

/** Chen starts the swing shift two hours early; 09:00 to 12:00 is still one short. */
export const stretchBeforeOption = (): RepairOption =>
	repairOption({
		kind: "OVERTIME_STRETCH",
		fills: "PART",
		cells: [
			workCell(CHEN, SATURDAY, SWING_SHIFT, { stretchBeforeMinutes: 120 }),
		],
		people: [
			person(CHEN, "Chen Wei", { before: 2880, after: 3000, contract: 2640 }),
		],
		stillShort: [
			{ start: "2026-10-17T09:00:00", end: "2026-10-17T12:00:00", shortBy: 1 },
		],
		extraMinutes: { overtime: 120 },
	});

/** Ben stays on after Lunch Rush and Chen starts the swing shift early: between them they cover it. */
export const stretchPairOption = (): RepairOption =>
	repairOption({
		kind: "STRETCH_PAIR",
		cells: [
			workCell(BEN, SATURDAY, LUNCH_RUSH, { stretchAfterMinutes: 120 }),
			workCell(CHEN, SATURDAY, SWING_SHIFT, { stretchBeforeMinutes: 120 }),
		],
		people: [
			person(BEN, "Ben Ong", { before: 1200, after: 1320, contract: 1320 }),
			person(CHEN, "Chen Wei", { before: 2880, after: 3000, contract: 2640 }),
		],
		extraMinutes: { overtime: 240 },
	});

/** Aisha works Saturday instead of Friday: Friday becomes a day off of Saturday's type. */
export const daySwapOption = (): RepairOption =>
	repairOption({
		kind: "DAY_SWAP",
		cells: [
			workCell(AISHA, SATURDAY, FRONT_DESK_AM),
			{ membershipId: AISHA, day: FRIDAY, kind: "OFF", dayType: "OFF" },
		],
		people: [
			person(AISHA, "Aisha Rahman", {
				before: 1800,
				after: 1800,
				contract: 2640,
			}),
		],
	});

/** The older repair's two-person change: Ben moves to Front Desk AM, and Aisha is called in for his Lunch Rush. */
export const otherTwoPeopleOption = (): RepairOption =>
	repairOption({
		kind: "OTHER",
		cells: [
			workCell(BEN, SATURDAY, FRONT_DESK_AM),
			workCell(AISHA, SATURDAY, LUNCH_RUSH),
		],
		people: [
			person(BEN, "Ben Ong", { before: 1200, after: 1440, contract: 1320 }),
			person(AISHA, "Aisha Rahman", {
				before: 1800,
				after: 1920,
				contract: 2640,
			}),
		],
		extraMinutes: { pastContract: 120 },
	});

/** Aisha's call-in on a Front Desk AM short by two: she fills one of the two for all its hours. */
export const oneOfTwoOption = (): RepairOption =>
	callInOption({
		fills: "ONE_PERSON",
		stillShort: [{ ...MORNING, shortBy: 1 }],
	});

/** The engine's answer at revision 1 with the given options, and why others were not assigned when given. */
export const repairOptionsFixture = (
	options: Array<RepairOption> = [feasibleRepair()],
	notAssigned: Array<NotAssignedPerson> | null = null,
	overrides: Partial<RepairOptions> = {}
): RepairOptions => ({
	revision: 1,
	conflictId: "conflict-1",
	search: { complete: true, optionsFound: options.length },
	shortNow: [{ ...MORNING, shortBy: 1 }],
	options,
	notAssigned,
	...overrides,
});

/**
 * Why the other Front Desk staff were not put on the short shift: Dana is
 * on leave, Ella would break the company's "Rest between shifts", and Farid
 * could take it.
 */
export const NOT_ASSIGNED_FIXTURE: Array<NotAssignedPerson> = [
	{
		memberProfileId: "m-4",
		name: "Dana Lim",
		couldTake: false,
		reasons: [
			{
				code: "on_leave",
				rule: null,
				constraintId: null,
				constraintName: null,
			},
		],
	},
	{
		memberProfileId: "m-5",
		name: "Ella Tan",
		couldTake: false,
		reasons: [
			{
				code: "breaks_rule",
				rule: "minimum_rest_between_shifts",
				constraintId: "c-rest",
				constraintName: "Rest between shifts",
			},
		],
	},
	{ memberProfileId: "m-6", name: "Farid Aziz", couldTake: true, reasons: [] },
];
