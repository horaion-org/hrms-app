import type {
	RepairMove,
	RepairOption,
	RepairOptions,
} from "@/features/scheduling/cover/engineRepairApi";
import { shiftCopyId } from "@/features/scheduling/shifts/fixtures";

/*
 * API-shaped engine repair answers for stories and tests; never sent
 * anywhere. Front Desk AM is one short on Saturday 17 October: the engine
 * can call in Aisha Rahman (m-1), move Ben Ong (m-2) from the swing shift,
 * or stretch Chen Wei's (m-3) shift by two hours; a staffing gap as
 * generated usually gets an honest no.
 */

const SATURDAY = "2026-10-17";
const FRONT_DESK_AM = shiftCopyId("front-desk-am");
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

/** Chen's shift stretched by two hours. */
export const stretchMove = (): RepairMove => ({
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
});

/** A feasible option with the given moves, not checked against working-time rules. */
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
	...overrides,
});

/** The engine's honest no for a staffing gap as generated. */
export const infeasibleRepair = (): RepairOption => ({
	feasible: false,
	workingTimeRulesChecked: false,
	moves: [],
	summary: null,
	infeasibleReason: "Moving anyone would leave another shift short.",
	leftShort: [MORNING],
	leftShortBy: 1,
	warnings: [],
});

/** The engine's answer with the given options. */
export const repairOptionsFixture = (
	options: Array<RepairOption> = [feasibleRepair()]
): RepairOptions => ({ conflictId: "conflict-1", options });
