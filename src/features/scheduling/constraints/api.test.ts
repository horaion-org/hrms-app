import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError, UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	createConstraint,
	deleteConstraint,
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
	CONSTRAINT_FIXTURES,
	CONSTRAINT_OPTIONS,
	CONSTRAINT_OPTIONS_RESPONSE,
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

	it("lists the department's live constraints, inactive ones and constraints without a requirement included", async () => {
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
			constraints.find(
				(constraint) => constraint.type === "REST_BETWEEN_SHIFTS"
			)?.requirement
		).toBeNull();
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
			hasRequirement: false,
			onePerDepartment: true,
			fields: [
				{
					field: "REST_HOURS",
					kind: "NUMBER",
					minCount: 1,
					maxCount: 1,
					min: 1,
					max: 24,
				},
			],
		});
		expect(calls.map((call) => call.path)).toEqual([
			`${DEPARTMENT}/constraint-options`,
		]);
	});

	it("keeps all six types when the department has no shifts or job titles", async () => {
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
		expect(options.types).toHaveLength(6);
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

	it("puts a taken name on the name, naming it, and a second once-only type on the type", () => {
		expect(
			constraintRefusal(
				problem(409, "CONSTRAINT_NAME_CONFLICT"),
				"Rest",
				false,
				t
			).fields
		).toEqual({
			name: 'A constraint named "Rest" already exists in this department. Choose a different name.',
		});
		expect(
			constraintRefusal(
				problem(409, "CONSTRAINT_TYPE_ALREADY_USED"),
				"Rest",
				false,
				t
			).fields
		).toEqual({
			type: "This department already has a constraint of this type. Edit that one instead.",
		});
		expect(
			constraintRefusal(problem(400, "INVALID_CONSTRAINT_NAME"), "R", false, t)
				.fields
		).toEqual({ name: "Check the constraint name and try again." });
	});

	it.each([
		[
			400,
			"INVALID_CONSTRAINT",
			"This constraint doesn’t fit its type. Check the values and try again.",
		],
		[
			400,
			"CONSTRAINT_JOB_TITLE_NOT_IN_DEPARTMENT",
			"A chosen job title isn’t an active job title of this department. Choose again.",
		],
		[404, "SHIFT_NOT_FOUND", "A chosen shift no longer exists. Choose again."],
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
			constraintRefusal(problem(status, code), "Rest", true, t).message
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
