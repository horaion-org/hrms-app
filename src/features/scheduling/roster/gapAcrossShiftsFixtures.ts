import dayjs from "dayjs";
import type {
	GenerationFindings,
	Schedule,
	ScheduleAssignment,
	ScheduleShift,
} from "@/features/scheduling/schedules/api";
import {
	emptyFindingsFixture,
	generatedScheduleFixture,
	generationFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	frozenShiftsFixture,
	shiftFixture,
} from "@/features/scheduling/shifts/fixtures";

/*
 * A week whose generation left a Shift Leader short across two shifts and a
 * Concierge asked "if possible" short, shaped as a live answer for the week of
 * 23 November 2026 was, for stories and tests; never sent anywhere. The people
 * are the fixtures' own (schedule s-1's roster, moved six weeks on).
 */

/** The fixtures' week of 12 October to this week of 23 November. */
const DAYS_MOVED = 42;

const SHIFT_LEADER = { jobTitleId: "shift-leader", name: "Shift Leader" };

/** The two afternoon shifts the Shift Leader rule counts across. */
const AFTERNOON_SHIFTS: Array<ScheduleShift> = [
	shiftFixture({
		shiftId: "shift-b",
		name: "Shift B",
		frozen: true,
		startTime: "13:00",
		endTime: "22:30",
		days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
		roles: [SHIFT_LEADER],
	}),
	shiftFixture({
		shiftId: "shift-f",
		name: "Shift F",
		frozen: true,
		startTime: "16:30",
		endTime: "02:00",
		days: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
		roles: [SHIFT_LEADER],
	}),
];

/** One day's Shift Leader gap, counted across Shift B and Shift F, as the engine sends it. */
const shiftLeaderGap = (
	date: string
): GenerationFindings["conflicts"][number] => ({
	kind: "conflict",
	conflictId: `shift-leader-${date}`,
	date,
	roleUuid: SHIFT_LEADER.jobTitleId,
	startBlock: 26,
	endBlock: 52,
	start: `${date}T13:00:00`,
	end: `${dayjs(date).add(1, "day").format("YYYY-MM-DD")}T02:00:00`,
	missing: 1,
	message:
		"shifts Shift B and Shift F: got 0 of at least 1 employee with role Shift Leader.",
	sourceRule: "shift_demand_requirement",
	sourceRuleId: "afternoon-shift-leader",
	shiftUuids: ["shift-b", "shift-f"],
	repairRungs: ["reassign"],
	employeeUuid: null,
});

/** One day's Concierge rule asked "if possible" and not met: the engine sends only its sentence. */
const conciergeNotMet = (
	date: string
): GenerationFindings["errors"][number] => ({
	employeeId: null,
	date,
	messages: [
		"If possible, not met: shift Shift B: got 0 of at least 1 employee with role Concierge.",
	],
});

/** The week's findings: Monday's and Tuesday's gap and Concierge line. */
const gapAcrossShiftsFindings = (): GenerationFindings => {
	const days = ["2026-11-23", "2026-11-24"];
	return {
		...emptyFindingsFixture(),
		scheduleStatus: "OPTIMAL",
		generatedAt: "2026-11-23T07:23:42Z",
		conflicts: days.map(shiftLeaderGap),
		errors: days.map(conciergeNotMet),
	};
};

/** A fixture roster day moved six weeks on, ids included. */
const movedDay = (row: ScheduleAssignment): ScheduleAssignment => {
	const day = dayjs(row.day).add(DAYS_MOVED, "day").format("YYYY-MM-DD");
	return {
		...row,
		assignmentId: row.assignmentId.replace(row.day, day),
		day,
	};
};

/** The week of 23 November 2026: its schedule, its roster and its frozen shifts. */
export const gapAcrossShiftsWeekFixture = (): {
	schedule: Schedule;
	assignments: Array<ScheduleAssignment>;
	shifts: Array<ScheduleShift>;
} => ({
	schedule: generatedScheduleFixture({
		status: "GENERATED",
		periodStart: "2026-11-23",
		periodEnd: "2026-11-29",
		generation: generationFixture({ findings: gapAcrossShiftsFindings() }),
	}),
	assignments: scheduleAssignmentsFixture().map(movedDay),
	shifts: [...frozenShiftsFixture(), ...AFTERNOON_SHIFTS],
});
