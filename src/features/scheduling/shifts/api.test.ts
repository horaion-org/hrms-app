import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError, UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	createShift,
	deleteShift,
	fetchShiftRoleOptions,
	groupsOf,
	updateShift,
	type ShiftBody,
} from "@/features/scheduling/shifts/api";
import {
	SHIFT_FIXTURES,
	SHIFT_ROLE_OPTIONS,
	departmentShiftFixture,
} from "@/features/scheduling/shifts/fixtures";
import {
	deleteShiftRefusal,
	shiftRefusal,
} from "@/features/scheduling/shifts/shiftRefusal";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const DEPARTMENT = "/api/v1/companies/c-1/branches/b-1/departments/d-1";
const SHIFTS = `${DEPARTMENT}/shifts`;

const BODY: ShiftBody = {
	name: "Front Desk AM",
	group: "Front Desk",
	colour: "#E9A55A",
	startTime: "09:00",
	endTime: "15:00",
	days: ["MON", "TUE"],
	jobTitleIds: ["front-desk-staff"],
};

const LIVE = departmentShiftFixture();

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

describe("shifts client", () => {
	it("posts a live shift to its department and parses the answer", async () => {
		const calls = stubApi({
			[`POST ${SHIFTS}`]: { status: 201, body: envelope(LIVE) },
		});

		await expect(createShift("c-1", UNIT, BODY)).resolves.toEqual(LIVE);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it.each([
		["day", { days: ["FUNDAY"] }],
		["group", { group: 7 }],
		["colour", { colour: "orange" }],
		["department", { departmentId: null }],
	])(
		"rejects a shift with an unknown %s instead of trusting its type",
		async (_field, overrides) => {
			stubApi({
				[`POST ${SHIFTS}`]: {
					status: 201,
					body: envelope({ ...LIVE, ...overrides }),
				},
			});

			await expect(createShift("c-1", UNIT, BODY)).rejects.toBeInstanceOf(
				UnexpectedResponseError
			);
		}
	);

	it("replaces and deletes a live shift at its department", async () => {
		const calls = stubApi({
			[`PUT ${SHIFTS}/front-desk-am`]: { status: 200, body: envelope(LIVE) },
			[`DELETE ${SHIFTS}/front-desk-am`]: { status: 204 },
		});

		await expect(
			updateShift("c-1", UNIT, "front-desk-am", BODY)
		).resolves.toEqual(LIVE);
		await expect(
			deleteShift("c-1", UNIT, "front-desk-am")
		).resolves.toBeUndefined();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`PUT ${SHIFTS}/front-desk-am`,
			`DELETE ${SHIFTS}/front-desk-am`,
		]);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it("reads the department's role options, not its job titles", async () => {
		const calls = stubApi({
			[`GET ${DEPARTMENT}/shift-role-options`]: {
				status: 200,
				body: envelope(SHIFT_ROLE_OPTIONS),
			},
		});

		await expect(fetchShiftRoleOptions("c-1", UNIT)).resolves.toEqual(
			SHIFT_ROLE_OPTIONS
		);
		expect(calls.map((call) => call.path)).toEqual([
			`${DEPARTMENT}/shift-role-options`,
		]);
	});

	it("names each group once, in the order first met", () => {
		expect(groupsOf(SHIFT_FIXTURES)).toEqual([
			"Front Desk",
			"Kitchen",
			"Service",
			"Concierge",
			"Night",
		]);
	});
});

describe("shift refusals", () => {
	const t = authTestI18n.t;
	const problem = (status: number, errorCode: string): ApiProblemError =>
		new ApiProblemError({
			status,
			errorCode,
			fieldErrors: [],
			reason: "http",
			message: errorCode,
		});

	it("puts a taken name on the name, naming it", () => {
		expect(
			shiftRefusal(problem(409, "SHIFT_NAME_CONFLICT"), "Late", false, t).fields
		).toEqual({
			name: 'A shift named "Late" already exists in this department. Choose a different name.',
		});
	});

	it("puts a role outside the department on the roles", () => {
		expect(
			shiftRefusal(
				problem(400, "SHIFT_ROLE_NOT_IN_DEPARTMENT"),
				"Late",
				true,
				t
			).fields
		).toEqual({
			jobTitleIds:
				"A chosen role isn’t an active job title of this department. Choose again.",
		});
	});

	it("explains an inactive department, a lost permission and a vanished shift", () => {
		expect(
			shiftRefusal(problem(409, "DEPARTMENT_INACTIVE"), "Late", false, t)
				.message
		).toBe("This department is inactive. Activate it first.");
		expect(
			shiftRefusal(problem(403, "ACCESS_DENIED"), "Late", true, t).message
		).toBe("You no longer have permission to change this shift.");
		expect(deleteShiftRefusal(problem(404, "SHIFT_NOT_FOUND"), t)).toBe(
			"This shift no longer exists."
		);
		expect(deleteShiftRefusal(new Error("offline"), t)).toBe(
			"We couldn’t delete the shift. Try again."
		);
	});
});
