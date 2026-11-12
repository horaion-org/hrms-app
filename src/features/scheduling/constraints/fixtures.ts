import type {
	ConstraintComparison,
	ConstraintField,
	ConstraintFieldKind,
	ConstraintFieldSpec,
	FieldStrictness,
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

/** Which way each field protects people more, as the API's `ConstraintField` declares it. */
const STRICTNESS: Record<ConstraintField, FieldStrictness> = {
	COMPARISON: "MUST_MATCH",
	HEADCOUNT: "FOLLOWS_COMPARISON",
	STAND_INS_PER_PERSON: "HIGHER_IS_STRICTER",
	DAYS_OFF: "FOLLOWS_COMPARISON",
	PERIOD_DAYS: "AGAINST_COMPARISON",
	REST_HOURS: "HIGHER_IS_STRICTER",
	JOB_TITLE: "MUST_MATCH",
	STAND_IN_JOB_TITLE: "MUST_MATCH",
	SHIFT: "MUST_MATCH",
	WEEKDAY: "SUPERSET_IS_STRICTER",
	DAY_TYPE: "MUST_MATCH",
	DAYS_IN_A_ROW: "LOWER_IS_STRICTER",
	DAY_TYPE_COUNT: "FOLLOWS_COMPARISON",
};

/** Types that link to nothing may be set for the whole company; the rest by a Department only. */
const DEPARTMENT_ONLY = ["DEPARTMENT"] as const;
const ANY_LEVEL = ["COMPANY", "DEPARTMENT"] as const;

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
	strictness: STRICTNESS[field],
	comparisons: null,
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
	strictness: STRICTNESS[field],
	comparisons: null,
});

/** A comparison field that takes only some comparisons, as the weekly rule's does. */
const comparisonOf = (
	comparisons: Array<ConstraintComparison>
): ConstraintFieldSpec => ({
	...choice("COMPARISON", "COMPARISON"),
	comparisons,
});

/** Neither added by the system nor limited to full-timers, as every type but the day-type rules. */
const ORDINARY = { addedBySystem: false, fullTimersOnly: false } as const;

/** Every constraint type as `constraint-options` answers it, declared as the API's `ConstraintType` does. */
export const CONSTRAINT_TYPE_OPTIONS: Array<ConstraintTypeOption> = [
	{
		type: "SHIFT_STAFFING",
		category: "STAFFING",
		hasRequirement: true,
		onePerDepartment: false,
		levels: [...DEPARTMENT_ONLY],
		...ORDINARY,
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
		levels: [...DEPARTMENT_ONLY],
		...ORDINARY,
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
		levels: [...DEPARTMENT_ONLY],
		...ORDINARY,
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
		levels: [...ANY_LEVEL],
		...ORDINARY,
		fields: [
			choice("COMPARISON", "COMPARISON"),
			number("DAYS_OFF", 0, 31),
			number("PERIOD_DAYS", 1, 7),
		],
	},
	{
		type: "AVOID_DAYS_OFF_ON",
		category: "SHIFT_PATTERN",
		hasRequirement: false,
		onePerDepartment: false,
		levels: [...ANY_LEVEL],
		...ORDINARY,
		fields: [choice("WEEKDAY", "WEEKDAY", 1, 7)],
	},
	{
		type: "REST_BETWEEN_SHIFTS",
		category: "WORKING_HOURS",
		hasRequirement: false,
		onePerDepartment: true,
		levels: [...ANY_LEVEL],
		...ORDINARY,
		fields: [number("REST_HOURS", 1, 24)],
	},
	{
		type: "MAX_DAYS_WITHOUT_DAY_TYPES",
		category: "SHIFT_PATTERN",
		hasRequirement: false,
		onePerDepartment: false,
		levels: [...ANY_LEVEL],
		fields: [
			number("DAYS_IN_A_ROW", 1, 14),
			choice("DAY_TYPE", "DAY_TYPE", 1, 3),
		],
		addedBySystem: false,
		fullTimersOnly: true,
	},
	{
		type: "DAY_TYPE_DAYS_PER_WEEK",
		category: "SHIFT_PATTERN",
		hasRequirement: false,
		onePerDepartment: false,
		levels: [...ANY_LEVEL],
		fields: [
			comparisonOf(["AT_LEAST", "EXACTLY"]),
			number("DAY_TYPE_COUNT", 1, 7),
			choice("DAY_TYPE", "DAY_TYPE", 1, 1),
		],
		addedBySystem: true,
		fullTimersOnly: true,
	},
];

/** The day types a rule may name, as the API lists them: its non-working day types, then leave. */
export const DAY_TYPE_CHOICES = ["OFF", "REST", "LEAVE"];

/** Front Office's live shifts and active job titles, as the constraint dialog offers them. */
export const CONSTRAINT_OPTIONS: ConstraintOptions = {
	types: CONSTRAINT_TYPE_OPTIONS,
	dayTypeChoices: DAY_TYPE_CHOICES,
	shifts: SHIFT_FIXTURES.map(({ shiftId, name, roles }) => ({
		shiftId,
		name,
		jobTitleIds: roles.map((role) => role.jobTitleId),
	})),
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
	dayTypeChoices: CONSTRAINT_OPTIONS.dayTypeChoices,
	links: {
		SHIFT: CONSTRAINT_OPTIONS.shifts.map(({ shiftId, name, jobTitleIds }) => ({
			id: shiftId,
			name,
			jobTitleIds,
		})),
		JOB_TITLE: CONSTRAINT_OPTIONS.jobTitles.map(({ jobTitleId, name }) => ({
			id: jobTitleId,
			name,
			jobTitleIds: [],
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
	departmentName: "Front Office",
	branchId: "b-1",
	branchName: "Main branch",
	category: "STAFFING",
	requirement: "MUST",
	status: "ACTIVE",
	createdAt: "2026-10-08T09:00:00Z",
	updatedAt: "2026-10-08T09:00:00Z",
	level: "DEPARTMENT",
	lock: null,
	appliesToBranches: [],
	appliesToDepartments: [],
	locked: false,
	overridesConstraintId: null,
	overriddenByConstraintId: null,
	replacementStatus: null,
	requiresPeople: false,
	...overrides,
});

/** A constraint of the company's work policy, as a Department's list or the policy's own list answers it. */
export const companyConstraintFixture = (
	overrides: Partial<DepartmentConstraint> &
		Pick<
			DepartmentConstraint,
			"constraintId" | "name" | "type" | "values" | "lock"
		>
): DepartmentConstraint =>
	constraintFixture({
		departmentId: null,
		departmentName: null,
		branchId: null,
		branchName: null,
		level: "COMPANY",
		locked: overrides.lock === "LOCKED",
		...overrides,
	});

/** The company's work policy, whole company: eleven hours of rest, locked, and a default on weekends. */
export const COMPANY_CONSTRAINT_FIXTURES: Array<DepartmentConstraint> = [
	companyConstraintFixture({
		constraintId: "company-rest",
		name: "Company rest",
		type: "REST_BETWEEN_SHIFTS",
		category: "WORKING_HOURS",
		requirement: null,
		lock: "LOCKED",
		values: [plain("REST_HOURS", "11")],
	}),
	companyConstraintFixture({
		constraintId: "company-weekends",
		name: "Company weekends",
		type: "AVOID_DAYS_OFF_ON",
		category: "SHIFT_PATTERN",
		requirement: null,
		lock: "DEFAULT",
		values: [plain("WEEKDAY", "SAT")],
	}),
];

/** The weekly rule the system adds to the work policy: at least 1 Rest day each week, locked. */
export const WEEKLY_RULE_FIXTURE: DepartmentConstraint =
	companyConstraintFixture({
		constraintId: "weekly-rest",
		name: "Rest days each week",
		type: "DAY_TYPE_DAYS_PER_WEEK",
		category: "SHIFT_PATTERN",
		requirement: null,
		lock: "LOCKED",
		values: [
			plain("COMPARISON", "AT_LEAST"),
			plain("DAY_TYPE_COUNT", "1"),
			plain("DAY_TYPE", "REST"),
		],
	});

/** Front Office's days limit: at most 6 days in a row without a Rest day or a Day off. */
export const DAYS_LIMIT_FIXTURE: DepartmentConstraint = constraintFixture({
	constraintId: "days-limit",
	name: "Days in a row",
	type: "MAX_DAYS_WITHOUT_DAY_TYPES",
	category: "SHIFT_PATTERN",
	requirement: null,
	values: [
		plain("DAYS_IN_A_ROW", "6"),
		plain("DAY_TYPE", "OFF"),
		plain("DAY_TYPE", "REST"),
	],
});

/** A work-policy constraint for two chosen Departments, Orchard's Kitchen and Bar. */
export const DEPARTMENTS_POLICY_FIXTURE: DepartmentConstraint =
	companyConstraintFixture({
		constraintId: "kitchen-bar-rest",
		name: "Kitchen and Bar rest",
		type: "DAYS_OFF_PER_PERIOD",
		category: "SHIFT_PATTERN",
		requirement: "MUST",
		lock: "LOCKED",
		values: [
			plain("COMPARISON", "AT_LEAST"),
			plain("DAYS_OFF", "2"),
			plain("PERIOD_DAYS", "7"),
		],
		appliesToDepartments: [
			{
				departmentId: "d-2",
				departmentName: "Bar",
				branchId: "b-1",
				branchName: "Orchard",
			},
			{
				departmentId: "d-1",
				departmentName: "Kitchen",
				branchId: "b-1",
				branchName: "Orchard",
			},
		],
	});

/** A work-policy constraint for one chosen Branch, Orchard, and every Department in it. */
export const BRANCH_POLICY_FIXTURE: DepartmentConstraint =
	companyConstraintFixture({
		constraintId: "orchard-weekends",
		name: "Orchard weekends",
		type: "AVOID_DAYS_OFF_ON",
		category: "SHIFT_PATTERN",
		requirement: null,
		lock: "DEFAULT",
		values: [plain("WEEKDAY", "SUN")],
		appliesToBranches: [{ branchId: "b-1", branchName: "Orchard" }],
	});

/** Front Office's live constraints, by name, as the list answers them; Weekend days on is inactive. */
export const CONSTRAINT_FIXTURES: Array<DepartmentConstraint> = [
	constraintFixture({
		constraintId: "closing-supervisor",
		requiresPeople: true,
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
		requiresPeople: true,
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
		requiresPeople: true,
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
		level: "DEPARTMENT",
		setBy: "Front Office",
		locked: false,
		overridesConstraintId: null,
		replacesCompanyConstraint: false,
	}));
