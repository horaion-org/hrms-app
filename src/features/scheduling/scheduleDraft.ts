import type { ConstraintStatus } from "@/features/scheduling/constraints/api";
import type { DepartmentPath } from "@/features/scheduling/paths";
import type {
	Schedule,
	ScheduleConstraint,
	ScheduleShift,
	ScheduleStatus,
} from "@/features/scheduling/schedules/api";
import {
	WEEKDAYS,
	type ShiftRole,
	type Weekday,
} from "@/features/scheduling/shifts/api";

/*
 * A schedule being set up in the Create Schedule steps. The schedule exists
 * on the API as a DRAFT from the moment Setup is completed. Its shifts and
 * constraints are the Department's live ones, read on their own; the page keeps
 * the setup and which shifts and constraints are ticked (seeded from the
 * schedule, the shifts' again once they load) until they are saved again.
 * Once generated, the schedule shows the frozen copies it was generated
 * with and changes no more. Allocations and demand stay in the page until
 * their API exists.
 */

export { WEEKDAYS, type ShiftRole, type Weekday };

/**
 * One of a schedule's constraints as the Constraints step shows it: for a
 * draft, one of the Department's live constraints, inactive ones included; once
 * generated, one of its frozen copies, which has no status and whose id is
 * never sent to a constraint route, since a generated schedule is never
 * changed again.
 */
export type Constraint = Omit<ScheduleConstraint, "included" | "frozen"> & {
	/** A live constraint's; a frozen copy has none. */
	status?: ConstraintStatus;
};

/** Only an ACTIVE constraint can be ticked; the API refuses an inactive one. */
export const isTickable = (constraint: Pick<Constraint, "status">): boolean =>
	constraint.status === "ACTIVE";

/** Why a step's list is not shown: a notice, or an alert when loading failed. */
export type ListProblem = { message: string; alert: boolean };

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

/** The saved schedule the steps work on: its id and the department it belongs to, which never changes. */
export type SavedSchedule = DepartmentPath & {
	scheduleId: string;
	branchName: string;
	departmentName: string;
	/** Anything but DRAFT is frozen: its shifts are copies and nothing is saved again. */
	status: ScheduleStatus;
};

export type ScheduleDraft = {
	/** Unset until the Setup step is first completed. */
	setup: ScheduleSetup | undefined;
	/** Unset until the API has created the draft, at the end of Setup. */
	saved: SavedSchedule | undefined;
	/** The ticked shifts: the schedule's own until its shifts load, then theirs, then the person's. */
	includedShiftIds: Array<string>;
	/** Set once `includedShiftIds` was taken from the loaded shifts; later reloads keep the page's ticks. */
	shiftsSeeded: boolean;
	/** The ticked constraints: the schedule's own, then the person's. */
	includedConstraintIds: Array<string>;
	allocations: Allocations;
	forecastMode: ForecastMode;
	demand: TimeBlockDemand;
};

/** A fresh draft, with nothing chosen yet. */
export const emptyScheduleDraft = (): ScheduleDraft => ({
	setup: undefined,
	saved: undefined,
	includedShiftIds: [],
	shiftsSeeded: false,
	includedConstraintIds: [],
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
	shift: Pick<ScheduleShift, "startTime" | "endTime">
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
	shift: ScheduleShift,
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
	shifts: Array<ScheduleShift>
): Array<ScheduleShift> =>
	shifts.filter((shift) => draft.includedShiftIds.includes(shift.shiftId));

/** Every job role the shifts need, once each, in the order first met. */
export const rolesOf = (shifts: Array<ScheduleShift>): Array<ShiftRole> => {
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

const covers = (shift: ScheduleShift, slotStart: string): boolean => {
	const offset =
		(minutesOf(slotStart) - minutesOf(shift.startTime) + MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return offset < shiftHours(shift) * 60;
};

/** Demand for every slot from the staff each shift allocates while it runs. */
export const autoFillDemand = (
	shifts: Array<ScheduleShift>,
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
	shifts: Array<ScheduleShift>,
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

/** The setup, the saved schedule and its ticks, as the API answers a schedule. */
export const fromSchedule = (
	schedule: Schedule
): Pick<
	ScheduleDraft,
	"setup" | "saved" | "includedShiftIds" | "includedConstraintIds"
> => ({
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
		branchName: schedule.branchName,
		departmentId: schedule.departmentId,
		departmentName: schedule.departmentName,
		status: schedule.status,
	},
	includedShiftIds: schedule.includedShiftIds,
	includedConstraintIds: schedule.includedConstraintIds,
});

/** Whether the schedule was generated: its shifts are frozen and nothing is saved again. */
export const isFrozen = (saved: Pick<SavedSchedule, "status">): boolean =>
	saved.status !== "DRAFT";

/**
 * The ticks that still name a listed shift. A shift deleted since it was
 * ticked drops out once the shifts reload, so it is never sent again.
 */
export const tickedOf = (
	draft: Pick<ScheduleDraft, "includedShiftIds">,
	shifts: Array<Pick<ScheduleShift, "shiftId">> | undefined
): Array<string> =>
	shifts === undefined
		? draft.includedShiftIds
		: draft.includedShiftIds.filter((shiftId) =>
				shifts.some((shift) => shift.shiftId === shiftId)
			);

/**
 * The constraint ticks that still name a listed ACTIVE constraint. A constraint
 * deleted or deactivated since it was ticked drops out once the constraints
 * reload, so it is never sent again.
 */
export const tickedConstraintsOf = (
	draft: Pick<ScheduleDraft, "includedConstraintIds">,
	constraints: Array<Pick<Constraint, "constraintId" | "status">> | undefined
): Array<string> =>
	constraints === undefined
		? draft.includedConstraintIds
		: draft.includedConstraintIds.filter((constraintId) =>
				constraints.some(
					(constraint) =>
						constraint.constraintId === constraintId && isTickable(constraint)
				)
			);

/** The ids of the shifts the API keeps as included. */
export const includedIdsOf = (shifts: Array<ScheduleShift>): Array<string> =>
	shifts.filter((shift) => shift.included).map((shift) => shift.shiftId);

export type ScheduleDraftAction =
	/** A schedule the API created or answered: what the page holds starts again from it, ticks included. */
	| { type: "scheduleLoaded"; schedule: Schedule }
	/** The schedule's shifts as the API answers them: the first answer after a load seeds the ticks from `included`. */
	| { type: "shiftsLoaded"; shifts: Array<ScheduleShift> }
	| { type: "setupSaved"; setup: ScheduleSetup }
	| { type: "shiftsIncluded"; shiftIds: Array<string> }
	/** A shift the API no longer has; its selection and allocations go with it. */
	| { type: "shiftRemoved"; shiftId: string }
	| { type: "constraintsIncluded"; constraintIds: Array<string> }
	/** A constraint the API no longer has; its tick goes with it. */
	| { type: "constraintRemoved"; constraintId: string }
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
	| { type: "demandAutoFilled"; shifts: Array<ScheduleShift> };

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
		case "constraintRemoved":
			return {
				...draft,
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
