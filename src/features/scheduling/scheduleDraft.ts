import type { DepartmentPath } from "@/features/scheduling/paths";
import type { Schedule } from "@/features/scheduling/schedules/api";
import {
	WEEKDAYS,
	type Shift,
	type ShiftRole,
	type Weekday,
} from "@/features/scheduling/shifts/api";

/*
 * A schedule being set up in the Create Schedule steps. The schedule exists
 * on the API as a DRAFT from the moment Setup is completed, and its shifts
 * are its own, read on their own; the page keeps the setup and which shifts
 * are included (taken from the shifts once they load) until they are saved
 * again. Constraints are still a stand-in kept in the page
 * (seeded by `emptyScheduleDraft`), and allocations and demand stay in the
 * page too, until their API exists.
 */

export { WEEKDAYS, type Shift, type ShiftRole, type Weekday };

export const CONSTRAINT_TYPES = [
	"STAFFING_REQUIREMENT",
	"ROLE_COVERAGE",
	"SHIFT_PATTERN",
	"WORKING_HOURS",
] as const;

export type ConstraintType = (typeof CONSTRAINT_TYPES)[number];

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const CONSTRAINT_STATUSES = ["ACTIVE", "DRAFT", "DISABLED"] as const;

export type ConstraintStatus = (typeof CONSTRAINT_STATUSES)[number];

export type Constraint = {
	constraintId: string;
	name: string;
	type: ConstraintType;
	/** The rule in words, as the person wrote it. */
	details: string;
	priority: Priority;
	status: ConstraintStatus;
};

/** Whether demand is set per shift or per time block. */
export type ForecastMode = "SHIFT" | "BLOCKS";

export type ScheduleSetup = {
	departmentId: string;
	name: string;
	/** The Monday the week-long period starts, as an ISO date. */
	periodStart: string;
	includeLeave: boolean;
	allowOpenShifts: boolean;
};

/** People allocated to each job title of each shift, by shift id then job title id. */
export type Allocations = Record<string, Record<string, number>>;

/** Staff wanted per slot (keyed by its "HH:mm" start), then per job title id. */
export type TimeBlockDemand = Record<string, Record<string, number>>;

/** The saved draft the steps work on: its id and the department it belongs to, which never changes. */
export type SavedSchedule = DepartmentPath & {
	scheduleId: string;
	departmentName: string;
};

export type ScheduleDraft = {
	/** Unset until the Setup step is first completed. */
	setup: ScheduleSetup | undefined;
	/** Unset until the API has created the draft, at the end of Setup. */
	saved: SavedSchedule | undefined;
	includedShiftIds: Array<string>;
	/** Set once `includedShiftIds` was taken from the loaded shifts; later reloads keep the page's ticks. */
	shiftsSeeded: boolean;
	/** Stand-in constraints kept in the page until the scheduling constraints API exists. */
	constraints: Array<Constraint>;
	includedConstraintIds: Array<string>;
	allocations: Allocations;
	forecastMode: ForecastMode;
	demand: TimeBlockDemand;
};

/** Stand-in constraints until the scheduling constraints API exists. */
export const seedConstraints = (): Array<Constraint> => [
	{
		constraintId: "minimum-shift-staffing",
		name: "Minimum Shift Staffing",
		type: "STAFFING_REQUIREMENT",
		details:
			"There should be at least 2 employees assigned to Front Desk AM (09:00 – 15:00) shift",
		priority: "HIGH",
		status: "ACTIVE",
	},
	{
		constraintId: "required-role-coverage",
		name: "Required Role Coverage",
		type: "ROLE_COVERAGE",
		details:
			"There should be at least 1 supervisor assigned to Closing Crew (16:00 – 00:00) shift",
		priority: "HIGH",
		status: "ACTIVE",
	},
	{
		constraintId: "minimum-daily-staffing",
		name: "Minimum Daily Staffing",
		type: "STAFFING_REQUIREMENT",
		details: "There should be at least 8 employees scheduled each weekday",
		priority: "MEDIUM",
		status: "ACTIVE",
	},
	{
		constraintId: "maximum-consecutive-working-days",
		name: "Maximum Consecutive Working Days",
		type: "SHIFT_PATTERN",
		details: "Employees should not work more than 6 consecutive days",
		priority: "MEDIUM",
		status: "ACTIVE",
	},
	{
		constraintId: "rest-between-shifts",
		name: "Rest Between Shifts",
		type: "WORKING_HOURS",
		details:
			"Employees should have at least 10 hours between consecutive shifts",
		priority: "HIGH",
		status: "DRAFT",
	},
	{
		constraintId: "weekend-staffing-coverage",
		name: "Weekend Staffing Coverage",
		type: "STAFFING_REQUIREMENT",
		details:
			"There should be at least 3 employees assigned during weekend peak hours",
		priority: "LOW",
		status: "DISABLED",
	},
];

/** A fresh draft; only the stand-in constraints are filled in. */
export const emptyScheduleDraft = (): ScheduleDraft => ({
	setup: undefined,
	saved: undefined,
	includedShiftIds: [],
	shiftsSeeded: false,
	constraints: seedConstraints(),
	includedConstraintIds: ["minimum-shift-staffing", "required-role-coverage"],
	allocations: {},
	forecastMode: "SHIFT",
	demand: {},
});

const MINUTES_PER_DAY = 24 * 60;

/** The grain of the day: shift times are chosen in these steps and demand forecast per such slot. */
export const TIME_STEP_MINUTES = 30;

const minutesOf = (time: string): number => {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

const timeOf = (minutes: number): string => {
	const wrapped = minutes % MINUTES_PER_DAY;
	const hours = String(Math.floor(wrapped / 60)).padStart(2, "0");
	return `${hours}:${String(wrapped % 60).padStart(2, "0")}`;
};

/** Every "HH:mm" a shift may start or end at, one per step from midnight. */
export const timeSteps = (): Array<string> => {
	const times: Array<string> = [];
	for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += TIME_STEP_MINUTES)
		times.push(timeOf(minutes));
	return times;
};

/** How long a shift lasts in hours, counting past midnight. */
export const shiftHours = (
	shift: Pick<Shift, "startTime" | "endTime">
): number => {
	const length =
		(minutesOf(shift.endTime) - minutesOf(shift.startTime) + MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return (length === 0 ? MINUTES_PER_DAY : length) / 60;
};

/** How many people a shift's role is allocated; none until set. */
export const allocatedTo = (
	allocations: Allocations,
	shiftId: string,
	jobTitleId: string
): number => allocations[shiftId]?.[jobTitleId] ?? 0;

export const allocatedStaff = (
	shift: Shift,
	allocations: Allocations
): number =>
	shift.roles.reduce(
		(total, role) =>
			total + allocatedTo(allocations, shift.shiftId, role.jobTitleId),
		0
	);

/** Monday to Friday exactly, which reads better as "Weekdays". */
export const isWeekdays = (days: Array<Weekday>): boolean =>
	days.length === 5 && WEEKDAYS.slice(0, 5).every((day) => days.includes(day));

/** The shifts the draft includes, in the list's order. */
export const includedShifts = (
	draft: Pick<ScheduleDraft, "includedShiftIds">,
	shifts: Array<Shift>
): Array<Shift> =>
	shifts.filter((shift) => draft.includedShiftIds.includes(shift.shiftId));

/** Every job role the shifts need, once each, in the order first met. */
export const rolesOf = (shifts: Array<Shift>): Array<ShiftRole> => {
	const roles = new Map<string, string>();
	for (const shift of shifts)
		for (const role of shift.roles)
			if (!roles.has(role.jobTitleId)) roles.set(role.jobTitleId, role.name);
	return [...roles].map(([jobTitleId, name]) => ({ jobTitleId, name }));
};

export const TIME_BLOCK_GROUPS = [
	{ groupId: "earlyMorning", start: "06:00", end: "09:00" },
	{ groupId: "morning", start: "09:00", end: "12:00" },
	{ groupId: "midday", start: "12:00", end: "15:00" },
	{ groupId: "afternoon", start: "15:00", end: "18:00" },
	{ groupId: "evening", start: "18:00", end: "22:00" },
] as const;

/** A slot of `TIME_STEP_MINUTES` as its start and end times. */
export type TimeSlot = { start: string; end: string };

export const slotsOf = (group: {
	start: string;
	end: string;
}): Array<TimeSlot> => {
	const slots: Array<TimeSlot> = [];
	for (
		let minutes = minutesOf(group.start);
		minutes < minutesOf(group.end);
		minutes += TIME_STEP_MINUTES
	)
		slots.push({
			start: timeOf(minutes),
			end: timeOf(minutes + TIME_STEP_MINUTES),
		});
	return slots;
};

export type DemandLevel = "none" | "low" | "medium" | "high";

/** Low is 1–2 people, medium 3–5 and high 6 or more. */
export const demandLevel = (staff: number): DemandLevel => {
	if (staff <= 0) return "none";
	if (staff <= 2) return "low";
	return staff <= 5 ? "medium" : "high";
};

const covers = (shift: Shift, slotStart: string): boolean => {
	const offset =
		(minutesOf(slotStart) - minutesOf(shift.startTime) + MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return offset < shiftHours(shift) * 60;
};

/** Demand for every slot from the staff each shift allocates while it runs. */
export const autoFillDemand = (
	shifts: Array<Shift>,
	allocations: Allocations
): TimeBlockDemand => {
	const demand: TimeBlockDemand = {};
	for (const group of TIME_BLOCK_GROUPS)
		for (const slot of slotsOf(group)) {
			const row: Record<string, number> = {};
			for (const shift of shifts)
				if (covers(shift, slot.start))
					for (const role of shift.roles)
						row[role.jobTitleId] =
							(row[role.jobTitleId] ?? 0) +
							allocatedTo(allocations, shift.shiftId, role.jobTitleId);
			demand[slot.start] = row;
		}
	return demand;
};

export type ScheduleSummary = {
	shifts: number;
	/** Distinct job roles across the included shifts. */
	roles: number;
	/** Share of the shifts' roles given at least one person, as a whole percentage. */
	coverage: number;
};

/** What the Generate step reports, from the included shifts and their allocations. */
export const summarise = (
	shifts: Array<Shift>,
	allocations: Allocations
): ScheduleSummary => {
	const positions = shifts.flatMap((shift) =>
		shift.roles.map((role) =>
			allocatedTo(allocations, shift.shiftId, role.jobTitleId)
		)
	);
	const filled = positions.filter((allocated) => allocated > 0).length;
	return {
		shifts: shifts.length,
		roles: rolesOf(shifts).length,
		coverage:
			positions.length === 0
				? 0
				: Math.round((filled / positions.length) * 100),
	};
};

/** The setup and the saved draft of a schedule as the API answers it. */
export const fromSchedule = (
	schedule: Schedule
): Pick<ScheduleDraft, "setup" | "saved"> => ({
	setup: {
		departmentId: schedule.departmentId,
		name: schedule.name,
		periodStart: schedule.periodStart,
		includeLeave: schedule.includeLeave,
		allowOpenShifts: schedule.allowOpenShifts,
	},
	saved: {
		scheduleId: schedule.scheduleId,
		branchId: schedule.branchId,
		departmentId: schedule.departmentId,
		departmentName: schedule.departmentName,
	},
});

/** The ids of the shifts the API keeps as included. */
export const includedIdsOf = (shifts: Array<Shift>): Array<string> =>
	shifts.filter((shift) => shift.included).map((shift) => shift.shiftId);

export type ScheduleDraftAction =
	/** A schedule the API created or answered: what the page holds starts again from it. */
	| { type: "scheduleLoaded"; schedule: Schedule }
	/** The schedule's shifts as the API answers them: the first answer after a load seeds the ticks. */
	| { type: "shiftsLoaded"; shifts: Array<Shift> }
	| { type: "setupSaved"; setup: ScheduleSetup }
	| { type: "shiftsIncluded"; shiftIds: Array<string> }
	/** A shift the API no longer has; its selection and allocations go with it. */
	| { type: "shiftRemoved"; shiftId: string }
	| { type: "constraintsIncluded"; constraintIds: Array<string> }
	| { type: "constraintDeleted"; constraintId: string }
	| { type: "forecastModeChosen"; mode: ForecastMode }
	| {
			type: "allocationChanged";
			shiftId: string;
			jobTitleId: string;
			allocated: number;
	  }
	| {
			type: "demandChanged";
			slotStart: string;
			jobTitleId: string;
			staff: number;
	  }
	| { type: "demandAutoFilled"; shifts: Array<Shift> };

export const scheduleDraftReducer = (
	draft: ScheduleDraft,
	action: ScheduleDraftAction
): ScheduleDraft => {
	switch (action.type) {
		case "scheduleLoaded":
			return { ...emptyScheduleDraft(), ...fromSchedule(action.schedule) };
		case "shiftsLoaded":
			return draft.shiftsSeeded
				? draft
				: {
						...draft,
						includedShiftIds: includedIdsOf(action.shifts),
						shiftsSeeded: true,
					};
		case "setupSaved":
			// A saved draft's department never changes, so what is chosen carries over.
			return { ...draft, setup: action.setup };
		case "shiftsIncluded":
			return { ...draft, includedShiftIds: action.shiftIds };
		case "shiftRemoved":
			return {
				...draft,
				includedShiftIds: draft.includedShiftIds.filter(
					(shiftId) => shiftId !== action.shiftId
				),
				allocations: Object.fromEntries(
					Object.entries(draft.allocations).filter(
						([shiftId]) => shiftId !== action.shiftId
					)
				),
			};
		case "constraintsIncluded":
			return { ...draft, includedConstraintIds: action.constraintIds };
		case "constraintDeleted":
			return {
				...draft,
				constraints: draft.constraints.filter(
					(constraint) => constraint.constraintId !== action.constraintId
				),
				includedConstraintIds: draft.includedConstraintIds.filter(
					(constraintId) => constraintId !== action.constraintId
				),
			};
		case "forecastModeChosen":
			return { ...draft, forecastMode: action.mode };
		case "allocationChanged":
			return {
				...draft,
				allocations: {
					...draft.allocations,
					[action.shiftId]: {
						...draft.allocations[action.shiftId],
						[action.jobTitleId]: Math.max(0, action.allocated),
					},
				},
			};
		case "demandChanged":
			return {
				...draft,
				demand: {
					...draft.demand,
					[action.slotStart]: {
						...draft.demand[action.slotStart],
						[action.jobTitleId]: Math.max(0, action.staff),
					},
				},
			};
		case "demandAutoFilled":
			return {
				...draft,
				demand: autoFillDemand(
					includedShifts(draft, action.shifts),
					draft.allocations
				),
			};
	}
};
