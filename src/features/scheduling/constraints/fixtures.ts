import type {
	ConstraintField,
	ConstraintFieldKind,
	ConstraintFieldSpec,
	ConstraintOptions,
	ConstraintTypeOption,
	ConstraintValue,
	DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import type { ScheduleConstraint } from "@/features/scheduling/schedules/api";
import {
	SHIFT_FIXTURES,
	shiftCopyId,
} from "@/features/scheduling/shifts/fixtures";

/*
 * API-shaped rows for stories and tests; never sent anywhere. Every constraint
 * is a live constraint of "Front Office" (d-1) naming the shifts of
 * `shifts/fixtures.ts`; draft s-1 ticks `INCLUDED_CONSTRAINT_IDS`.
 */

/** A field chosen from a list; one value unless the counts say otherwise. */
const choice = (
	field: ConstraintField,
	kind: ConstraintFieldKind,
	minCount = 1,
	maxCount = 1
): ConstraintFieldSpec => ({
	field,
	kind,
	minCount,
	maxCount,
	min: null,
	max: null,
});

/** A number field in its range. */
const number = (
	field: ConstraintField,
	min: number,
	max: number
): ConstraintFieldSpec => ({
	field,
	kind: "NUMBER",
	minCount: 1,
	maxCount: 1,
	min,
	max,
});

/** Every constraint type as `constraint-options` answers it, declared as the API's `ConstraintType` does. */
export const CONSTRAINT_TYPE_OPTIONS: Array<ConstraintTypeOption> = [
	{
		type: "SHIFT_STAFFING",
		category: "STAFFING",
		hasRequirement: true,
		onePerDepartment: false,
		fields: [
			choice("COMPARISON", "COMPARISON"),
			number("HEADCOUNT", 0, 999),
			choice("JOB_TITLE", "JOB_TITLE", 1, 20),
			choice("SHIFT", "SHIFT", 1, 20),
		],
	},
	{
		type: "SHIFT_STAFFING_WITH_STAND_INS",
		category: "STAFFING",
		hasRequirement: true,
		onePerDepartment: false,
		fields: [
			number("HEADCOUNT", 0, 999),
			number("STAND_INS_PER_PERSON", 1, 10),
			choice("JOB_TITLE", "JOB_TITLE", 1, 20),
			choice("STAND_IN_JOB_TITLE", "JOB_TITLE", 1, 20),
			choice("SHIFT", "SHIFT", 1, 20),
		],
	},
	{
		type: "ROLE_PRESENCE",
		category: "ROLE_COVERAGE",
		hasRequirement: true,
		onePerDepartment: false,
		fields: [
			choice("COMPARISON", "COMPARISON"),
			number("HEADCOUNT", 0, 999),
			choice("JOB_TITLE", "JOB_TITLE", 1, 20),
			choice("SHIFT", "SHIFT", 1, 20),
		],
	},
	{
		type: "DAYS_OFF_PER_PERIOD",
		category: "SHIFT_PATTERN",
		hasRequirement: true,
		onePerDepartment: false,
		fields: [
			choice("COMPARISON", "COMPARISON"),
			number("DAYS_OFF", 0, 31),
			number("PERIOD_DAYS", 1, 365),
		],
	},
	{
		type: "AVOID_DAYS_OFF_ON",
		category: "SHIFT_PATTERN",
		hasRequirement: false,
		onePerDepartment: false,
		fields: [choice("WEEKDAY", "WEEKDAY", 1, 7)],
	},
	{
		type: "REST_BETWEEN_SHIFTS",
		category: "WORKING_HOURS",
		hasRequirement: false,
		onePerDepartment: true,
		fields: [number("REST_HOURS", 1, 24)],
	},
];

/** Front Office's live shifts and active job titles, as the constraint dialog offers them. */
export const CONSTRAINT_OPTIONS: ConstraintOptions = {
	types: CONSTRAINT_TYPE_OPTIONS,
	shifts: SHIFT_FIXTURES.map(({ shiftId, name }) => ({ shiftId, name })),
	jobTitles: [
		{ jobTitleId: "cashier", name: "Cashier" },
		{ jobTitleId: "front-desk-lead", name: "Front Desk Lead" },
		{ jobTitleId: "front-desk-staff", name: "Front Desk Staff" },
		{ jobTitleId: "service-staff", name: "Service Staff" },
		{ jobTitleId: "supervisor", name: "Supervisor" },
	],
};

/** ConstraintOptionsResponse wire shape, distinct from the dialog's mapped choices. */
export const CONSTRAINT_OPTIONS_RESPONSE = {
	types: CONSTRAINT_OPTIONS.types,
	links: {
		SHIFT: CONSTRAINT_OPTIONS.shifts.map(({ shiftId, name }) => ({
			id: shiftId,
			name,
		})),
		JOB_TITLE: CONSTRAINT_OPTIONS.jobTitles.map(({ jobTitleId, name }) => ({
			id: jobTitleId,
			name,
		})),
	},
};

/** A plain value: a number, a comparison or a weekday. */
const plain = (field: ConstraintField, value: string): ConstraintValue => ({
	field,
	value,
	name: null,
});

/** A job title or shift, with its name. */
const named = (
	field: ConstraintField,
	value: string,
	name: string
): ConstraintValue => ({
	field,
	value,
	name,
});

/** One of Front Office's live constraints; `constraintId`, `name`, `type` and `values` set it apart. */
export const constraintFixture = (
	overrides: Partial<DepartmentConstraint> &
		Pick<DepartmentConstraint, "constraintId" | "name" | "type" | "values">
): DepartmentConstraint => ({
	departmentId: "d-1",
	category: "STAFFING",
	requirement: "MUST",
	status: "ACTIVE",
	createdAt: "2026-10-08T09:00:00Z",
	updatedAt: "2026-10-08T09:00:00Z",
	...overrides,
});

/** Front Office's live constraints, by name, as the list answers them; Weekend days on is inactive. */
export const CONSTRAINT_FIXTURES: Array<DepartmentConstraint> = [
	constraintFixture({
		constraintId: "closing-supervisor",
		name: "Closing supervisor",
		type: "ROLE_PRESENCE",
		category: "ROLE_COVERAGE",
		requirement: "SHOULD",
		values: [
			plain("COMPARISON", "AT_LEAST"),
			plain("HEADCOUNT", "1"),
			named("JOB_TITLE", "supervisor", "Supervisor"),
			named("SHIFT", "closing-crew", "Closing Crew"),
		],
	}),
	constraintFixture({
		constraintId: "lunch-stand-ins",
		name: "Lunch cover with stand-ins",
		type: "SHIFT_STAFFING_WITH_STAND_INS",
		requirement: "SHOULD",
		values: [
			plain("HEADCOUNT", "2"),
			plain("STAND_INS_PER_PERSON", "2"),
			named("JOB_TITLE", "supervisor", "Supervisor"),
			named("STAND_IN_JOB_TITLE", "service-staff", "Service Staff"),
			named("SHIFT", "lunch-rush", "Lunch Rush"),
		],
	}),
	constraintFixture({
		constraintId: "morning-cover",
		name: "Morning cover",
		type: "SHIFT_STAFFING",
		values: [
			plain("COMPARISON", "AT_LEAST"),
			plain("HEADCOUNT", "2"),
			named("JOB_TITLE", "front-desk-lead", "Front Desk Lead"),
			named("JOB_TITLE", "front-desk-staff", "Front Desk Staff"),
			named("SHIFT", "breakfast-prep", "Breakfast Prep"),
			named("SHIFT", "front-desk-am", "Front Desk AM"),
		],
	}),
	constraintFixture({
		constraintId: "rest-between-shifts",
		name: "Rest between shifts",
		type: "REST_BETWEEN_SHIFTS",
		category: "WORKING_HOURS",
		requirement: null,
		values: [plain("REST_HOURS", "10")],
	}),
	constraintFixture({
		constraintId: "two-days-off",
		name: "Two days off",
		type: "DAYS_OFF_PER_PERIOD",
		category: "SHIFT_PATTERN",
		values: [
			plain("COMPARISON", "AT_LEAST"),
			plain("DAYS_OFF", "2"),
			plain("PERIOD_DAYS", "7"),
		],
	}),
	constraintFixture({
		constraintId: "weekend-days-on",
		name: "Weekend days on",
		type: "AVOID_DAYS_OFF_ON",
		category: "SHIFT_PATTERN",
		requirement: null,
		status: "INACTIVE",
		values: [plain("WEEKDAY", "FRI"), plain("WEEKDAY", "SAT")],
	}),
];

/** The constraints draft s-1 ticks, by name, as the schedule answers them. */
export const INCLUDED_CONSTRAINT_IDS = [
	"lunch-stand-ins",
	"morning-cover",
	"rest-between-shifts",
];

/** The id generation gives the frozen copy of a live constraint: its own, never a live constraint's. */
export const constraintCopyId = (constraintId: string): string =>
	`${constraintId}-copy`;

/**
 * A generated schedule's constraints: the frozen copies of what was ticked,
 * each with its own id, a shift named by its frozen copy's (see
 * `frozenShiftsFixture`). Rest between shifts was since deactivated; its copy
 * is kept as it was.
 */
export const frozenConstraintsFixture = (): Array<ScheduleConstraint> =>
	CONSTRAINT_FIXTURES.filter((constraint) =>
		INCLUDED_CONSTRAINT_IDS.includes(constraint.constraintId)
	).map((constraint) => ({
		constraintId: constraintCopyId(constraint.constraintId),
		name: constraint.name,
		type: constraint.type,
		category: constraint.category,
		requirement: constraint.requirement,
		values: constraint.values.map((value) =>
			value.field === "SHIFT"
				? { ...value, value: shiftCopyId(value.value) }
				: value
		),
		included: true,
		frozen: true,
	}));
