import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError, UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	CONSTRAINT_TYPES,
	isRetiredConstraintType,
	companyConstraintsQuery,
	createConstraint,
	deleteConstraint,
	fetchCompanyConstraints,
	fetchConstraintOptions,
	fetchConstraints,
	updateConstraint,
	type ConstraintBody,
} from "@/features/scheduling/constraints/api";
import {
	constraintRefusal,
	deleteConstraintRefusal,
} from "@/features/scheduling/constraints/constraintRefusal";
import {
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS,
	CONSTRAINT_OPTIONS_RESPONSE,
	MOST_HOURS_A_DAY_FIXTURE,
	MOST_OVERTIME_A_MONTH_FIXTURE,
	PAY_RATES_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const DEPARTMENT = "/api/v1/companies/c-1/branches/b-1/departments/d-1";
const CONSTRAINTS = `${DEPARTMENT}/constraints`;

const BODY: ConstraintBody = {
	name: "Morning cover",
	type: "SHIFT_STAFFING",
	requirement: "MUST",
	status: "ACTIVE",
	values: [
		{ field: "COMPARISON", value: "AT_LEAST" },
		{ field: "HEADCOUNT", value: "2" },
		{ field: "JOB_TITLE", value: "front-desk-lead" },
		{ field: "SHIFT", value: "front-desk-am" },
	],
};

/** Morning cover, as the constraint routes answer it. */
const LIVE = CONSTRAINT_FIXTURES[2]!;

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

describe("constraints client", () => {
	it("posts a live constraint to its department with one value row per value and parses the answer", async () => {
		const calls = stubApi({
			[`POST ${CONSTRAINTS}`]: { status: 201, body: envelope(LIVE) },
		});

		await expect(createConstraint("c-1", UNIT, BODY)).resolves.toEqual(LIVE);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it("lists the department's live constraints, inactive ones included, each with its requirement", async () => {
		stubApi({
			[`GET ${CONSTRAINTS}`]: {
				status: 200,
				body: envelope(CONSTRAINT_FIXTURES),
			},
		});

		const constraints = await fetchConstraints("c-1", UNIT);

		expect(constraints).toEqual(CONSTRAINT_FIXTURES);
		expect(
			constraints.find((constraint) => constraint.status === "INACTIVE")?.name
		).toBe("Weekend days on");
		expect(
			constraints.find((constraint) => constraint.type === "AVOID_DAYS_OFF_ON")
				?.requirement
		).toBe("SHOULD");
	});

	it.each([
		["type", { type: "SHIFT_SEQUENCE" }],
		["category", { category: "AVAILABILITY" }],
		["requirement", { requirement: "MUST_NOT" }],
		["status", { status: "DRAFT" }],
		[
			"value field",
			{ values: [{ field: "PRIORITY", value: "1", name: null }] },
		],
	])(
		"rejects a constraint with an unknown %s instead of trusting its type",
		async (_part, overrides) => {
			stubApi({
				[`POST ${CONSTRAINTS}`]: {
					status: 201,
					body: envelope({ ...LIVE, ...overrides }),
				},
			});

			await expect(createConstraint("c-1", UNIT, BODY)).rejects.toBeInstanceOf(
				UnexpectedResponseError
			);
		}
	);

	it("replaces and deletes a live constraint at its department", async () => {
		const calls = stubApi({
			[`PUT ${CONSTRAINTS}/morning-cover`]: {
				status: 200,
				body: envelope(LIVE),
			},
			[`DELETE ${CONSTRAINTS}/morning-cover`]: { status: 204 },
		});

		await expect(
			updateConstraint("c-1", UNIT, "morning-cover", BODY)
		).resolves.toEqual(LIVE);
		await expect(
			deleteConstraint("c-1", UNIT, "morning-cover")
		).resolves.toBeUndefined();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`PUT ${CONSTRAINTS}/morning-cover`,
			`DELETE ${CONSTRAINTS}/morning-cover`,
		]);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it("reads every type's fields with the department's shifts and job titles from its constraint options", async () => {
		const calls = stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope(CONSTRAINT_OPTIONS_RESPONSE),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);

		expect(options).toEqual(CONSTRAINT_OPTIONS);
		expect(
			options.types.find((type) => type.type === "REST_BETWEEN_SHIFTS")
		).toEqual({
			type: "REST_BETWEEN_SHIFTS",
			category: "WORKING_HOURS",
			hasRequirement: true,
			requirementPolicy: "MUST_OR_SHOULD",
			onePerDepartment: true,
			levels: ["COMPANY", "DEPARTMENT"],
			fields: [
				{
					field: "REST_HOURS",
					kind: "NUMBER",
					minCount: 1,
					maxCount: 1,
					min: 1,
					max: 24,
					strictness: "HIGHER_IS_STRICTER",
					comparisons: null,
					listedBy: null,
					listsSomeOf: [],
					excludes: null,
					choices: [],
					partialComparisons: [],
				},
			],
			addedBySystem: false,
			fullTimersOnly: false,
		});
		expect(calls.map((call) => call.path)).toEqual([
			`${DEPARTMENT}/constraint-options`,
		]);
	});

	it("reads each shift's group, and none from an API that predates it", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					types: CONSTRAINT_OPTIONS_RESPONSE.types,
					links: {
						SHIFT: [
							{
								id: "lunch",
								name: "Lunch Rush",
								listedIds: {},
								group: "Service",
							},
							{ id: "old", name: "Old shift", listedIds: {} },
						],
						JOB_TITLE: [],
					},
				}),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);

		expect(
			options.shifts.map(({ shiftId, group }) => [shiftId, group])
		).toEqual([
			["lunch", "Service"],
			["old", null],
		]);
	});

	it("reads a shift's job titles as none from an API that predates them", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					types: CONSTRAINT_OPTIONS_RESPONSE.types,
					links: {
						SHIFT: [{ id: "front-desk-am", name: "Front Desk AM" }],
						JOB_TITLE: [],
					},
				}),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);

		expect(options.shifts).toEqual([
			{
				shiftId: "front-desk-am",
				name: "Front Desk AM",
				jobTitleIds: [],
				listedIds: {},
				group: null,
			},
		]);
	});

	it("reads which fields depend on which, and what each shift lists, with none from an API that predates them", async () => {
		const staffing = CONSTRAINT_OPTIONS_RESPONSE.types.find(
			(type) => type.type === "SHIFT_STAFFING_WITH_STAND_INS"
		)!;
		const older = {
			...staffing,
			fields: staffing.fields.map((spec) => {
				const predating: Record<string, unknown> = { ...spec };
				delete predating["listedBy"];
				delete predating["listsSomeOf"];
				delete predating["excludes"];
				return predating;
			}),
		};
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					...CONSTRAINT_OPTIONS_RESPONSE,
					types: [staffing, older],
				}),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);

		const [current, predating] = options.types;
		expect(
			current?.fields.map(({ field, listedBy, listsSomeOf, excludes }) => ({
				field,
				listedBy,
				listsSomeOf,
				excludes,
			}))
		).toEqual([
			{ field: "HEADCOUNT", listedBy: null, listsSomeOf: [], excludes: null },
			{
				field: "STAND_INS_PER_PERSON",
				listedBy: null,
				listsSomeOf: [],
				excludes: null,
			},
			{
				field: "JOB_TITLE",
				listedBy: "SHIFT",
				listsSomeOf: [],
				excludes: null,
			},
			{
				field: "STAND_IN_JOB_TITLE",
				listedBy: "SHIFT",
				listsSomeOf: [],
				excludes: "JOB_TITLE",
			},
			{
				field: "SHIFT",
				listedBy: null,
				listsSomeOf: ["JOB_TITLE", "STAND_IN_JOB_TITLE"],
				excludes: null,
			},
		]);
		expect(
			predating?.fields.every(
				(spec) =>
					spec.listedBy === null &&
					spec.listsSomeOf.length === 0 &&
					spec.excludes === null
			)
		).toBe(true);
		expect(
			options.shifts.find((shift) => shift.shiftId === "front-desk-am")
				?.listedIds
		).toEqual({
			JOB_TITLE: ["front-desk-staff", "front-desk-lead"],
		});
		expect(options.jobTitles[0]?.listedIds).toEqual({});
	});

	it("reads why a stored value no longer fits, a problem the app does not know as unknown, and none from an API that predates it", async () => {
		const [shift, jobTitle, comparison] = [
			{
				field: "SHIFT",
				value: "gone",
				name: "Old shift",
				problem: "UNAVAILABLE",
			},
			{
				field: "JOB_TITLE",
				value: "lead",
				name: "Lead",
				problem: "SOMETHING_NEW",
			},
			{ field: "COMPARISON", value: "AT_LEAST", name: null },
		];
		stubApi({
			[`GET ${CONSTRAINTS}`]: {
				status: 200,
				body: envelope([{ ...LIVE, values: [shift, jobTitle, comparison] }]),
			},
		});

		const [constraint] = await fetchConstraints("c-1", UNIT);

		expect(constraint?.values.map((value) => value.problem)).toEqual([
			"UNAVAILABLE",
			"UNKNOWN",
			undefined,
		]);
	});

	it("reads the day-type rules, the day types to choose from, and the comparisons a field takes", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope(CONSTRAINT_OPTIONS_RESPONSE),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);
		const weekly = options.types.find(
			(type) => type.type === "DAY_TYPE_DAYS_PER_WEEK"
		);
		const daysLimit = options.types.find(
			(type) => type.type === "MAX_DAYS_WITHOUT_DAY_TYPES"
		);

		expect(options.dayTypeChoices).toEqual(["OFF", "REST", "LEAVE"]);
		expect(weekly).toMatchObject({ addedBySystem: true, fullTimersOnly: true });
		expect(weekly?.fields[0]).toMatchObject({
			field: "COMPARISON",
			comparisons: ["AT_LEAST", "EXACTLY"],
		});
		expect(daysLimit).toMatchObject({
			addedBySystem: false,
			fullTimersOnly: true,
		});
		expect(
			daysLimit?.fields.map(({ field, kind, strictness }) => ({
				field,
				kind,
				strictness,
			}))
		).toEqual([
			{
				field: "DAYS_IN_A_ROW",
				kind: "NUMBER",
				strictness: "LOWER_IS_STRICTER",
			},
			{ field: "DAY_TYPE", kind: "DAY_TYPE", strictness: "MUST_MATCH" },
		]);
	});

	it("reads an API that predates day-type rules with safe defaults", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					types: [
						{
							type: "DAYS_OFF_PER_PERIOD",
							category: "SHIFT_PATTERN",
							hasRequirement: true,
							onePerDepartment: false,
							levels: ["COMPANY", "DEPARTMENT"],
							fields: [
								{
									field: "COMPARISON",
									kind: "COMPARISON",
									minCount: 1,
									maxCount: 1,
									min: null,
									max: null,
									strictness: "MUST_MATCH",
								},
							],
						},
					],
					links: CONSTRAINT_OPTIONS_RESPONSE.links,
				}),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);

		expect(options.dayTypeChoices).toEqual([]);
		expect(options.types[0]).toMatchObject({
			addedBySystem: false,
			fullTimersOnly: false,
		});
		expect(options.types[0]?.fields[0]?.comparisons).toBeNull();
	});

	it("reads the work policy's most hours a day and most overtime a month as system-owned, a lower figure stricter", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope(CONSTRAINT_OPTIONS_RESPONSE),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);
		const ceilings = options.types.filter(
			(type) =>
				type.type === "MAX_WORK_HOURS_PER_DAY" ||
				type.type === "MAX_OVERTIME_HOURS_PER_MONTH"
		);

		expect(
			ceilings.map(({ type, category, addedBySystem, onePerDepartment }) => ({
				type,
				category,
				addedBySystem,
				onePerDepartment,
			}))
		).toEqual([
			{
				type: "MAX_WORK_HOURS_PER_DAY",
				category: "WORKING_HOURS",
				addedBySystem: true,
				onePerDepartment: true,
			},
			{
				type: "MAX_OVERTIME_HOURS_PER_MONTH",
				category: "WORKING_HOURS",
				addedBySystem: true,
				onePerDepartment: true,
			},
		]);
		expect(
			ceilings.flatMap((type) =>
				type.fields.map(({ field, min, max, strictness }) => ({
					field,
					min,
					max,
					strictness,
				}))
			)
		).toEqual([
			{
				field: "WORK_HOURS_A_DAY",
				min: 1,
				max: 24,
				strictness: "LOWER_IS_STRICTER",
			},
			{
				field: "OVERTIME_HOURS_A_MONTH",
				min: 0,
				max: 744,
				strictness: "LOWER_IS_STRICTER",
			},
		]);
	});

	it("reads the working-time settings as ordinary types a planner adds, once per department", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope(CONSTRAINT_OPTIONS_RESPONSE),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);
		const settings = options.types.filter(
			(type) =>
				type.type === "MAX_CALL_BACKS_PER_PERSON" || type.type === "PAY_RATES"
		);

		expect(
			settings.map(({ type, addedBySystem, onePerDepartment, fields }) => ({
				type,
				addedBySystem,
				onePerDepartment,
				fields: fields.map(({ field, min, max }) => [field, min, max]),
			}))
		).toEqual([
			{
				type: "MAX_CALL_BACKS_PER_PERSON",
				addedBySystem: false,
				onePerDepartment: true,
				fields: [["CALL_BACKS", 0, 31]],
			},
			{
				type: "PAY_RATES",
				addedBySystem: false,
				onePerDepartment: true,
				fields: [
					["OVERTIME_PERCENT", 0, 1000],
					["REST_DAY_WORK_PERCENT", 0, 1000],
					["TIME_OFF_EARNED_PERCENT", 0, 1000],
					["DAY_OFF_WORK_PERCENT", 0, 1000],
				],
			},
		]);
	});

	it("reads each type's requirement policy, a setting neither Must nor If possible, a fixed one and an unknown one safely", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					...CONSTRAINT_OPTIONS_RESPONSE,
					// A fixed Must as an API that still fixes a type would send it, and a policy a newer API adds.
					types: CONSTRAINT_OPTIONS_RESPONSE.types.map((type) =>
						type.type === "SHIFT_STAFFING"
							? { ...type, requirementPolicy: "SOMETHING_NEW" }
							: type.type === "MAX_CALL_BACKS_PER_PERSON"
								? { ...type, requirementPolicy: "ALWAYS_MUST" }
								: type
					),
				}),
			},
		});

		const options = await fetchConstraintOptions("c-1", UNIT);
		const policyOf = (type: string): string | undefined =>
			options.types.find((option) => option.type === type)?.requirementPolicy;

		expect(policyOf("PAY_RATES")).toBe("SETTING");
		expect(policyOf("NO_OVERTIME_WHEN_GENERATING")).toBe("SETTING");
		expect(policyOf("REST_BETWEEN_SHIFTS")).toBe("MUST_OR_SHOULD");
		expect(policyOf("DAY_TYPE_DAYS_PER_WEEK")).toBe("MUST_OR_SHOULD");
		expect(policyOf("MAX_WORK_HOURS_PER_DAY")).toBe("MUST_OR_SHOULD");
		expect(policyOf("AVOID_DAYS_OFF_ON")).toBe("MUST_OR_SHOULD");
		expect(policyOf("MAX_CALL_BACKS_PER_PERSON")).toBe("ALWAYS_MUST");
		expect(policyOf("SHIFT_STAFFING")).toBe("UNKNOWN");
	});

	it("reads a work policy's pay rates", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/constraints": {
				status: 200,
				body: envelope([PAY_RATES_FIXTURE]),
			},
		});

		await expect(fetchCompanyConstraints("c-1", undefined)).resolves.toEqual([
			PAY_RATES_FIXTURE,
		]);
	});

	it("reads the seeded ceilings in the work policy", async () => {
		const rows = [MOST_HOURS_A_DAY_FIXTURE, MOST_OVERTIME_A_MONTH_FIXTURE];
		stubApi({
			"GET /api/v1/companies/c-1/constraints": {
				status: 200,
				body: envelope(rows),
			},
		});

		await expect(fetchCompanyConstraints("c-1", undefined)).resolves.toEqual(
			rows
		);
	});

	it("keeps every type when the department has no shifts or job titles", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					types: CONSTRAINT_OPTIONS_RESPONSE.types,
					links: { SHIFT: [], JOB_TITLE: [] },
				}),
			},
		});
		const options = await fetchConstraintOptions("c-1", UNIT);
		expect(options.types).toHaveLength(
			CONSTRAINT_TYPES.filter((type) => !isRetiredConstraintType(type)).length
		);
		expect(options.shifts).toEqual([]);
		expect(options.jobTitles).toEqual([]);
	});

	it("rejects malformed link choices instead of displaying unusable options", async () => {
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					types: CONSTRAINT_OPTIONS_RESPONSE.types,
					links: { SHIFT: [{ name: "Missing id" }], JOB_TITLE: [] },
				}),
			},
		});
		await expect(fetchConstraintOptions("c-1", UNIT)).rejects.toBeInstanceOf(
			UnexpectedResponseError
		);
	});

	it("rejects a field of an unknown kind, which no control could choose", async () => {
		const [first, ...rest] = CONSTRAINT_OPTIONS.types;
		stubApi({
			[`GET ${DEPARTMENT}/constraint-options`]: {
				status: 200,
				body: envelope({
					...CONSTRAINT_OPTIONS_RESPONSE,
					types: [
						{
							...first,
							fields: [
								{
									field: "HEADCOUNT",
									kind: "DURATION",
									minCount: 1,
									maxCount: 1,
									min: null,
									max: null,
								},
							],
						},
						...rest,
					],
				}),
			},
		});

		await expect(fetchConstraintOptions("c-1", UNIT)).rejects.toBeInstanceOf(
			UnexpectedResponseError
		);
	});

	it("reads the company's live constraints, naming the branch only when given", async () => {
		const rows = [...COMPANY_CONSTRAINT_FIXTURES, LIVE];
		const calls = stubApi({
			"GET /api/v1/companies/c-1/constraints": {
				status: 200,
				body: envelope(rows),
			},
		});

		await expect(fetchCompanyConstraints("c-1", undefined)).resolves.toEqual(
			rows
		);
		await expect(fetchCompanyConstraints("c-1", "b-1")).resolves.toEqual(rows);
		expect(calls.map((call) => [call.path, call.search])).toEqual([
			["/api/v1/companies/c-1/constraints", ""],
			["/api/v1/companies/c-1/constraints", "branchId=b-1"],
		]);
	});

	it("reads a company row without department or branch names, and a department row with them", async () => {
		stubApi({
			"GET /api/v1/companies/c-1/constraints": {
				status: 200,
				body: envelope([COMPANY_CONSTRAINT_FIXTURES[0], LIVE]),
			},
		});

		const [company, department] = await fetchCompanyConstraints(
			"c-1",
			undefined
		);

		expect(company).toMatchObject({
			departmentId: null,
			departmentName: null,
			branchId: null,
			branchName: null,
		});
		expect(department).toMatchObject({
			departmentName: "Front Office",
			branchId: "b-1",
			branchName: "Main branch",
		});
	});

	it("reads whether a constraint requires people, and false from an API that predates it", async () => {
		const { requiresPeople, ...predating } = CONSTRAINT_FIXTURES[2]!;
		stubApi({
			[`GET ${CONSTRAINTS}`]: {
				status: 200,
				body: envelope([CONSTRAINT_FIXTURES[2], predating]),
			},
		});

		const [staffing, older] = await fetchConstraints("c-1", UNIT);

		expect(requiresPeople).toBe(true);
		expect(staffing?.requiresPeople).toBe(true);
		expect(older?.requiresPeople).toBe(false);
	});

	it("asks for nothing without the read, and keys the company's constraints per branch", () => {
		expect(typeof companyConstraintsQuery("c-1", "b-1").queryFn).toBe(
			"function"
		);
		expect(
			typeof companyConstraintsQuery("c-1", undefined, false).queryFn
		).not.toBe("function");
		expect(companyConstraintsQuery("c-1", undefined).queryKey).toEqual([
			"scheduling",
			"c-1",
			"constraints",
			"all",
		]);
		expect(companyConstraintsQuery("c-1", "b-1").queryKey).toEqual([
			"scheduling",
			"c-1",
			"constraints",
			"b-1",
		]);
	});
});

describe("constraint refusals", () => {
	const t = authTestI18n.t;
	const problem = (status: number, errorCode: string): ApiProblemError =>
		new ApiProblemError({
			status,
			errorCode,
			fieldErrors: [],
			reason: "http",
			message: errorCode,
		});

	const department = { name: "Rest", editing: false, company: false };
	const company = { ...department, company: true };

	it("puts a taken name on the name, naming it, and a second once-only type on the type", () => {
		expect(
			constraintRefusal(problem(409, "CONSTRAINT_NAME_CONFLICT"), department, t)
				.fields
		).toEqual({
			name: 'A constraint named "Rest" already exists in this department. Choose a different name.',
		});
		expect(
			constraintRefusal(
				problem(409, "CONSTRAINT_TYPE_ALREADY_USED"),
				department,
				t
			).fields
		).toEqual({
			type: "This department already has a constraint of this type. Edit that one instead.",
		});
		expect(
			constraintRefusal(
				problem(400, "INVALID_CONSTRAINT_NAME"),
				{ ...department, name: "R" },
				t
			).fields
		).toEqual({ name: "Check the constraint name and try again." });
	});

	it("words a taken name, a second type and a changed type as the company's on the policy", () => {
		expect(
			constraintRefusal(problem(409, "CONSTRAINT_NAME_CONFLICT"), company, t)
				.fields
		).toEqual({
			name: 'The company already has a constraint named "Rest". Choose a different name.',
		});
		expect(
			constraintRefusal(
				problem(409, "CONSTRAINT_TYPE_ALREADY_USED"),
				company,
				t
			).fields
		).toEqual({
			type: "The company already has a constraint of this type. Edit that one instead.",
		});
		expect(
			constraintRefusal(
				problem(400, "CONSTRAINT_TYPE_FIXED"),
				{ ...company, editing: true },
				t
			).fields
		).toEqual({
			type: "A company constraint’s type can’t be changed. Add a new constraint instead.",
		});
	});

	it.each([
		[
			400,
			"INVALID_CONSTRAINT",
			"This constraint doesn’t fit its type. Check the values and try again.",
		],
		[
			400,
			"CONSTRAINT_LINK_NOT_IN_DEPARTMENT",
			"A chosen shift or job title is no longer part of this department. Choose again.",
		],
		[
			400,
			"CONSTRAINT_LINK_DOES_NOT_FIT",
			"A chosen job title isn’t on every chosen shift, or a chosen shift lists none of the chosen job titles. Choose again, choose fewer shifts, or change the shift first.",
		],
		[404, "CONSTRAINT_NOT_FOUND", "This constraint no longer exists."],
		[
			409,
			"DEPARTMENT_INACTIVE",
			"This department is inactive. Activate it first.",
		],
		[404, "DEPARTMENT_NOT_FOUND", "This department is no longer available."],
		[
			403,
			"ACCESS_DENIED",
			"You no longer have permission to change this constraint.",
		],
	])("explains %s %s as one message", (status, code, copy) => {
		expect(
			constraintRefusal(
				problem(status, code),
				{ ...department, editing: true },
				t
			).message
		).toBe(copy);
	});

	it("explains a refused delete as one message", () => {
		expect(
			deleteConstraintRefusal(problem(404, "CONSTRAINT_NOT_FOUND"), t)
		).toBe("This constraint no longer exists.");
		expect(deleteConstraintRefusal(problem(403, "ACCESS_DENIED"), t)).toBe(
			"You no longer have permission to delete constraints here."
		);
		expect(deleteConstraintRefusal(new Error("offline"), t)).toBe(
			"We couldn’t delete the constraint. Try again."
		);
	});
});
