/*
 * A schedule being set up in the Create Schedule steps. There is no scheduling
 * API yet, so the draft lives in the page and starts from `seedScheduleDraft`.
 * Swap the seed for API reads (and the reducer's results for writes) once the
 * endpoints exist; the rest of the flow only depends on these types.
 */

export const WEEKDAYS = [
	"MON",
	"TUE",
	"WED",
	"THU",
	"FRI",
	"SAT",
	"SUN",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** A job role a shift needs, with how many people the forecast allocates to it. */
export type ShiftRole = {
	/** The same job role shares an id across shifts. */
	roleId: string;
	name: string;
	allocated: number;
};

export type Shift = {
	shiftId: string;
	name: string;
	/** "HH:mm"; an `end` at or before `start` runs past midnight. */
	start: string;
	end: string;
	days: Array<Weekday>;
	/** People the shift needs in total; the forecast may not allocate more. */
	staffNeeded: number;
	roles: Array<ShiftRole>;
};

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

export type ForecastMode = "shift" | "blocks";

export type ScheduleSetup = {
	departmentId: string;
	name: string;
	/** The Monday the week-long period starts, as an ISO date. */
	periodStart: string;
	includeLeave: boolean;
	allowOpenShifts: boolean;
};

/** Staff wanted per 30-minute slot (keyed by its "HH:mm" start), then per role id. */
export type TimeBlockDemand = Record<string, Record<string, number>>;

export type ScheduleDraft = {
	/** Unset until the Setup step is first completed. */
	setup: ScheduleSetup | undefined;
	shifts: Array<Shift>;
	includedShiftIds: Array<string>;
	constraints: Array<Constraint>;
	includedConstraintIds: Array<string>;
	forecastMode: ForecastMode;
	demand: TimeBlockDemand;
	/** The furthest step index reached; steps after it stay closed. */
	reached: number;
};

const MINUTES_PER_DAY = 24 * 60;

const minutesOf = (time: string): number => {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	return hours * 60 + minutes;
};

const timeOf = (minutes: number): string => {
	const wrapped = minutes % MINUTES_PER_DAY;
	const hours = String(Math.floor(wrapped / 60)).padStart(2, "0");
	return `${hours}:${String(wrapped % 60).padStart(2, "0")}`;
};

/** How long a shift lasts in hours, counting past midnight. */
export const shiftHours = (shift: Pick<Shift, "start" | "end">): number => {
	const length =
		(minutesOf(shift.end) - minutesOf(shift.start) + MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return (length === 0 ? MINUTES_PER_DAY : length) / 60;
};

export const allocatedStaff = (shift: Shift): number =>
	shift.roles.reduce((total, role) => total + role.allocated, 0);

export type AllocationStatus = "complete" | "short" | "over";

export const allocationStatusOf = (
	allocated: number,
	needed: number
): AllocationStatus => {
	if (allocated > needed) return "over";
	return allocated < needed ? "short" : "complete";
};

export const allocationStatus = (shift: Shift): AllocationStatus =>
	allocationStatusOf(allocatedStaff(shift), shift.staffNeeded);

/** Monday to Friday exactly, which reads better as "Weekdays". */
export const isWeekdays = (days: Array<Weekday>): boolean =>
	days.length === 5 && WEEKDAYS.slice(0, 5).every((day) => days.includes(day));

export const includedShifts = (draft: ScheduleDraft): Array<Shift> =>
	draft.shifts.filter((shift) =>
		draft.includedShiftIds.includes(shift.shiftId)
	);

/** Every job role the shifts need, once each, in the order first met. */
export const rolesOf = (
	shifts: Array<Shift>
): Array<Pick<ShiftRole, "roleId" | "name">> => {
	const roles = new Map<string, string>();
	for (const shift of shifts)
		for (const role of shift.roles)
			if (!roles.has(role.roleId)) roles.set(role.roleId, role.name);
	return [...roles].map(([roleId, name]) => ({ roleId, name }));
};

export const TIME_BLOCK_GROUPS = [
	{ groupId: "earlyMorning", start: "06:00", end: "09:00" },
	{ groupId: "morning", start: "09:00", end: "12:00" },
	{ groupId: "midday", start: "12:00", end: "15:00" },
	{ groupId: "afternoon", start: "15:00", end: "18:00" },
	{ groupId: "evening", start: "18:00", end: "22:00" },
] as const;

const SLOT_MINUTES = 30;

/** A 30-minute slot as its start and end times. */
export type TimeSlot = { start: string; end: string };

export const slotsOf = (group: {
	start: string;
	end: string;
}): Array<TimeSlot> => {
	const slots: Array<TimeSlot> = [];
	for (
		let minutes = minutesOf(group.start);
		minutes < minutesOf(group.end);
		minutes += SLOT_MINUTES
	)
		slots.push({ start: timeOf(minutes), end: timeOf(minutes + SLOT_MINUTES) });
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
		(minutesOf(slotStart) - minutesOf(shift.start) + MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return offset < shiftHours(shift) * 60;
};

/** Demand for every slot from the staff each shift allocates while it runs. */
export const autoFillDemand = (shifts: Array<Shift>): TimeBlockDemand => {
	const demand: TimeBlockDemand = {};
	for (const group of TIME_BLOCK_GROUPS)
		for (const slot of slotsOf(group)) {
			const row: Record<string, number> = {};
			for (const shift of shifts)
				if (covers(shift, slot.start))
					for (const role of shift.roles)
						row[role.roleId] = (row[role.roleId] ?? 0) + role.allocated;
			demand[slot.start] = row;
		}
	return demand;
};

export type ScheduleSummary = {
	shifts: number;
	/** Staff positions across the included shifts. */
	roles: number;
	/** Share of positions the forecast fills, as a whole percentage. */
	coverage: number;
	/** Shifts allocating more staff than they need. */
	conflicts: number;
};

export const summarise = (draft: ScheduleDraft): ScheduleSummary => {
	const shifts = includedShifts(draft);
	const roles = shifts.reduce((total, shift) => total + shift.staffNeeded, 0);
	const filled = shifts.reduce(
		(total, shift) =>
			total + Math.min(allocatedStaff(shift), shift.staffNeeded),
		0
	);
	return {
		shifts: shifts.length,
		roles,
		coverage: roles === 0 ? 0 : Math.round((filled / roles) * 100),
		conflicts: shifts.filter((shift) => allocationStatus(shift) === "over")
			.length,
	};
};

export type ScheduleDraftAction =
	| { type: "setupSaved"; setup: ScheduleSetup }
	| { type: "shiftsIncluded"; shiftIds: Array<string> }
	| { type: "shiftDeleted"; shiftId: string }
	| { type: "constraintsIncluded"; constraintIds: Array<string> }
	| { type: "constraintDeleted"; constraintId: string }
	| { type: "forecastModeChosen"; mode: ForecastMode }
	| {
			type: "allocationChanged";
			shiftId: string;
			roleId: string;
			allocated: number;
	  }
	| { type: "demandChanged"; slotStart: string; roleId: string; staff: number }
	| { type: "demandAutoFilled" }
	| { type: "stepReached"; step: number };

export const scheduleDraftReducer = (
	draft: ScheduleDraft,
	action: ScheduleDraftAction
): ScheduleDraft => {
	switch (action.type) {
		case "setupSaved":
			return {
				...draft,
				setup: action.setup,
				reached: Math.max(draft.reached, 1),
			};
		case "shiftsIncluded":
			return { ...draft, includedShiftIds: action.shiftIds };
		case "shiftDeleted":
			return {
				...draft,
				shifts: draft.shifts.filter(
					(shift) => shift.shiftId !== action.shiftId
				),
				includedShiftIds: draft.includedShiftIds.filter(
					(shiftId) => shiftId !== action.shiftId
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
				shifts: draft.shifts.map((shift) =>
					shift.shiftId === action.shiftId
						? {
								...shift,
								roles: shift.roles.map((role) =>
									role.roleId === action.roleId
										? { ...role, allocated: Math.max(0, action.allocated) }
										: role
								),
							}
						: shift
				),
			};
		case "demandChanged":
			return {
				...draft,
				demand: {
					...draft.demand,
					[action.slotStart]: {
						...draft.demand[action.slotStart],
						[action.roleId]: Math.max(0, action.staff),
					},
				},
			};
		case "demandAutoFilled":
			return { ...draft, demand: autoFillDemand(includedShifts(draft)) };
		case "stepReached":
			return { ...draft, reached: Math.max(draft.reached, action.step) };
	}
};

const role = (roleId: string, name: string, allocated: number): ShiftRole => ({
	roleId,
	name,
	allocated,
});

/** Stand-in shifts and constraints until the scheduling API exists. */
export const seedScheduleDraft = (): ScheduleDraft => ({
	setup: undefined,
	shifts: [
		{
			shiftId: "front-desk-am",
			name: "Front Desk AM",
			start: "09:00",
			end: "15:00",
			days: ["MON", "TUE", "WED", "THU", "FRI"],
			staffNeeded: 4,
			roles: [
				role("front-desk-staff", "Front Desk Staff", 3),
				role("front-desk-lead", "Front Desk Lead", 1),
			],
		},
		{
			shiftId: "breakfast-prep",
			name: "Breakfast Prep",
			start: "06:00",
			end: "12:00",
			days: ["MON", "WED", "FRI", "SAT"],
			staffNeeded: 3,
			roles: [
				role("prep-cook", "Prep Cook", 2),
				role("pastry-assistant", "Pastry Assistant", 0),
			],
		},
		{
			shiftId: "lunch-rush",
			name: "Lunch Rush",
			start: "11:00",
			end: "13:00",
			days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
			staffNeeded: 6,
			roles: [
				role("service-staff", "Service Staff", 4),
				role("cashier", "Cashier", 1),
				role("kitchen-runner", "Kitchen Runner", 1),
				role("supervisor", "Supervisor", 1),
			],
		},
		{
			shiftId: "concierge-support",
			name: "Concierge Support",
			start: "10:00",
			end: "18:00",
			days: ["TUE", "WED", "THU"],
			staffNeeded: 2,
			roles: [role("concierge", "Concierge", 2)],
		},
		{
			shiftId: "swing-shift",
			name: "Swing Shift",
			start: "14:00",
			end: "22:00",
			days: ["MON", "TUE", "WED", "THU", "FRI"],
			staffNeeded: 5,
			roles: [
				role("closing-lead", "Closing Lead", 2),
				role("concierge", "Concierge", 2),
				role("duty-manager", "Duty Manager", 1),
			],
		},
		{
			shiftId: "closing-crew",
			name: "Closing Crew",
			start: "16:00",
			end: "00:00",
			days: ["FRI", "SAT", "SUN"],
			staffNeeded: 4,
			roles: [
				role("closing-lead", "Closing Lead", 1),
				role("service-staff", "Service Staff", 2),
				role("supervisor", "Supervisor", 1),
			],
		},
		{
			shiftId: "overnight-ops",
			name: "Overnight Ops",
			start: "23:00",
			end: "07:00",
			days: [...WEEKDAYS],
			staffNeeded: 2,
			roles: [
				role("night-auditor", "Night Auditor", 1),
				role("security", "Security", 1),
			],
		},
	],
	includedShiftIds: [
		"front-desk-am",
		"breakfast-prep",
		"lunch-rush",
		"swing-shift",
	],
	constraints: [
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
	],
	includedConstraintIds: ["minimum-shift-staffing", "required-role-coverage"],
	forecastMode: "shift",
	demand: {},
	reached: 0,
});
