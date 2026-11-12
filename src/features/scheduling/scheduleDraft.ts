import type { DepartmentPath } from "@/common/companyPath";
import {
	MINUTES_PER_DAY,
	minutesOfDay,
	TIME_STEP_MINUTES,
	timeOfDay,
	timeSteps,
} from "@/common/timeOfDay";
import type {
	ConstraintStatus,
	DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
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

export { TIME_STEP_MINUTES, timeSteps, WEEKDAYS, type ShiftRole, type Weekday };

/**
 * One of a schedule's constraints as the week's choice lists it: for a
 * draft, one of the Department's live constraints, inactive ones included; once
 * generated, one of its frozen copies, which has no status and whose id is
 * never sent to a constraint route, since a generated schedule is never
 * changed again.
 */
export type Constraint = Omit<
	ScheduleConstraint,
	"included" | "frozen" | "setBy" | "replacesCompanyConstraint"
> & {
	/** A live constraint's; a frozen copy has none. */
	status?: ConstraintStatus;
	/** The company's or Department's name, as a schedule's read gives it. */
	setBy?: string | null;
	/** A company constraint's lock, as the Department's list gives it. */
	lock?: DepartmentConstraint["lock"];
	/** On the Department's list, the Department constraint standing in for this company one there. */
	overriddenByConstraintId?: string | null;
	/** On the Department's list, where a replacement stands against its company constraint now. */
	replacementStatus?: DepartmentConstraint["replacementStatus"];
	/** A schedule's read: a Department's replacement standing in for a company constraint. */
	replacesCompanyConstraint?: boolean;
};

/** Only an ACTIVE constraint can be ticked; the API refuses an inactive one. */
export const isTickable = (constraint: Pick<Constraint, "status">): boolean =>
	constraint.status === "ACTIVE";

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
	/**
	 * Whether the ticks are what the week uses: false for a new draft until
	 * its week is chosen, when everything is used; true once loaded from the API.
	 */
	weekChosen: boolean;
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
	weekChosen: false,
	allocations: {},
	forecastMode: "SHIFT",
	demand: {},
});

/** How long a shift lasts in minutes, counting past midnight. */
export const shiftMinutes = (
	shift: Pick<ScheduleShift, "startTime" | "endTime">
): number => {
	const length =
		(minutesOfDay(shift.endTime) -
			minutesOfDay(shift.startTime) +
			MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return length === 0 ? MINUTES_PER_DAY : length;
};

/** How long a shift lasts in hours, counting past midnight. */
export const shiftHours = (
	shift: Pick<ScheduleShift, "startTime" | "endTime">
): number => shiftMinutes(shift) / 60;

/** A shift's length less its unpaid break, in minutes. */
export const paidShiftMinutes = (
	shift: Pick<ScheduleShift, "startTime" | "endTime" | "unpaidBreakMinutes">
): number => shiftMinutes(shift) - shift.unpaidBreakMinutes;

/**
 * Minutes as hours to two places, as the roster export shows them. Sum the
 * minutes first and round the total once, so totals match the export and the
 * hours ledger.
 */
export const hoursFromMinutes = (minutes: number): number =>
	Math.round((minutes * 100) / 60) / 100;

/** A shift's paid hours, to two places. */
export const paidShiftHours = (
	shift: Pick<ScheduleShift, "startTime" | "endTime" | "unpaidBreakMinutes">
): number => hoursFromMinutes(paidShiftMinutes(shift));

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
		let minutes = minutesOfDay(group.start);
		minutes < minutesOfDay(group.end);
		minutes += TIME_STEP_MINUTES
	)
		slots.push({
			start: timeOfDay(minutes),
			end: timeOfDay(minutes + TIME_STEP_MINUTES),
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
		(minutesOfDay(slotStart) -
			minutesOfDay(shift.startTime) +
			MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return offset < shiftMinutes(shift);
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
 * The constraints a draft applies, as the API's one rule decides them
 * (`EffectiveConstraint.appliedWith`): every listed locked one, and every tick
 * that still names a listed ACTIVE constraint, where a tick of a company
 * constraint the Department has since replaced counts as a tick of its
 * replacement. The API already returns a draft's ticks this way; this keeps a
 * draft's local ticks agreeing with it when the list reloads first, and drops
 * a constraint deleted or deactivated since, so it is never sent again.
 */
export const tickedConstraintsOf = (
	draft: Pick<ScheduleDraft, "includedConstraintIds">,
	constraints:
		| Array<
				Pick<
					Constraint,
					"constraintId" | "status" | "locked" | "overriddenByConstraintId"
				>
		  >
		| undefined
): Array<string> => {
	if (constraints === undefined) return draft.includedConstraintIds;
	const applies = (constraintId: string): boolean =>
		constraints.some(
			(constraint) =>
				constraint.constraintId === constraintId &&
				isTickable(constraint) &&
				!constraint.overriddenByConstraintId
		);
	const standingIn = (constraintId: string): string =>
		constraints.find((constraint) => constraint.constraintId === constraintId)
			?.overriddenByConstraintId ?? constraintId;
	const locked = constraints
		.filter((constraint) => constraint.locked)
		.map((constraint) => constraint.constraintId);
	return [
		...new Set([...locked, ...draft.includedConstraintIds.map(standingIn)]),
	].filter(applies);
};

/** The ids of the shifts the API keeps as included. */
export const includedIdsOf = (shifts: Array<ScheduleShift>): Array<string> =>
	shifts.filter((shift) => shift.included).map((shift) => shift.shiftId);

export type ScheduleDraftAction =
	/** A schedule the API created or answered: what the page holds starts again from it, ticks included. */
	| { type: "scheduleLoaded"; schedule: Schedule }
	/** The schedule's shifts as the API answers them: the first answer after a load seeds the ticks from `included`. */
	| { type: "shiftsLoaded"; shifts: Array<ScheduleShift> }
	| { type: "setupSaved"; setup: ScheduleSetup }
	/** What the week uses, as the manager chose it. */
	| {
			type: "weekChosen";
			shiftIds: Array<string>;
			constraintIds: Array<string>;
	  }
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
			return {
				...emptyScheduleDraft(),
				...fromSchedule(action.schedule),
				weekChosen: true,
			};
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
		case "weekChosen":
			return {
				...draft,
				includedShiftIds: action.shiftIds,
				includedConstraintIds: action.constraintIds,
				weekChosen: true,
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
