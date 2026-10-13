import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError, UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	createSchedule,
	fetchSchedule,
	fetchScheduleConstraints,
	fetchScheduleShifts,
	requestGeneration,
	updateSchedule,
	type ScheduleBody,
} from "@/features/scheduling/schedules/api";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	CONSTRAINT_FIXTURES,
	frozenConstraintsFixture,
} from "@/features/scheduling/constraints/fixtures";
import {
	generationRefusal,
	scheduleRefusal,
	scheduleRefusalMessage,
} from "@/features/scheduling/schedules/scheduleRefusal";
import {
	frozenShiftsFixture,
	scheduleShiftsFixture,
} from "@/features/scheduling/shifts/fixtures";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const SCHEDULES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules";

const BODY: ScheduleBody = {
	name: "Front Office - Week 42",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
	includedShiftIds: ["front-desk-am"],
	includedConstraintIds: ["morning-cover"],
};

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

describe("schedules client", () => {
	it("creates a draft for a department and parses it", async () => {
		const schedule = scheduleFixture();
		const calls = stubApi({
			[`POST ${SCHEDULES}`]: { status: 201, body: envelope(schedule) },
		});

		await expect(createSchedule("c-1", UNIT, BODY)).resolves.toEqual(schedule);
		expect(calls[0]?.body).toEqual(BODY);
	});

	it("reads and replaces one schedule at its department, ticks included", async () => {
		const schedule = scheduleFixture();
		const calls = stubApi({
			[`GET ${SCHEDULES}/s-1`]: { status: 200, body: envelope(schedule) },
			[`PUT ${SCHEDULES}/s-1`]: { status: 200, body: envelope(schedule) },
		});
		const body = { ...BODY, name: "Front Office - Late Week" };

		await expect(fetchSchedule("c-1", UNIT, "s-1")).resolves.toEqual(schedule);
		await expect(updateSchedule("c-1", UNIT, "s-1", body)).resolves.toEqual(
			schedule
		);
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`GET ${SCHEDULES}/s-1`,
			`PUT ${SCHEDULES}/s-1`,
		]);
		expect(calls[1]?.body).toEqual(body);
	});

	it("parses a generated schedule with who asked for it", async () => {
		const schedule = generatedScheduleFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: { status: 200, body: envelope(schedule) },
		});

		await expect(fetchSchedule("c-1", UNIT, "s-1")).resolves.toEqual(schedule);
	});

	it("rejects a schedule with an unknown status instead of trusting its type", async () => {
		stubApi({
			[`GET ${SCHEDULES}/s-1`]: {
				status: 200,
				body: envelope(scheduleFixture({ status: "PUBLISHED" as "DRAFT" })),
			},
		});

		await expect(fetchSchedule("c-1", UNIT, "s-1")).rejects.toBeInstanceOf(
			UnexpectedResponseError
		);
	});

	it("lists a draft's live shifts and a generated schedule's frozen copies", async () => {
		const live = scheduleShiftsFixture();
		const frozen = frozenShiftsFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1/shifts`]: [
				{ status: 200, body: envelope(live) },
				{ status: 200, body: envelope(frozen) },
			],
		});

		await expect(fetchScheduleShifts("c-1", UNIT, "s-1")).resolves.toEqual(
			live
		);
		const copies = await fetchScheduleShifts("c-1", UNIT, "s-1");
		expect(copies).toEqual(frozen);
		expect(copies.some((shift) => shift.shiftId === null)).toBe(true);
	});

	it("lists a draft's live active constraints with their ticks and a generated schedule's frozen copies", async () => {
		const live = CONSTRAINT_FIXTURES.filter(
			(constraint) => constraint.status === "ACTIVE"
		).map((constraint) => ({
			constraintId: constraint.constraintId,
			name: constraint.name,
			type: constraint.type,
			category: constraint.category,
			requirement: constraint.requirement,
			values: constraint.values,
			included: constraint.constraintId === "morning-cover",
			frozen: false,
		}));
		const frozen = frozenConstraintsFixture();
		stubApi({
			[`GET ${SCHEDULES}/s-1/constraints`]: [
				{ status: 200, body: envelope(live) },
				{ status: 200, body: envelope(frozen) },
			],
		});

		await expect(fetchScheduleConstraints("c-1", UNIT, "s-1")).resolves.toEqual(
			live
		);
		const copies = await fetchScheduleConstraints("c-1", UNIT, "s-1");
		expect(copies).toEqual(frozen);
		// A source constraint deactivated since has no id.
		expect(copies.some((constraint) => constraint.constraintId === null)).toBe(
			true
		);
	});

	it("requests generation with no body and reads nothing back", async () => {
		const calls = stubApi({
			[`POST ${SCHEDULES}/s-1/generation`]: {
				status: 200,
				body: envelope(generatedScheduleFixture()),
			},
		});

		await expect(
			requestGeneration("c-1", UNIT, "s-1")
		).resolves.toBeUndefined();
		expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
			`POST ${SCHEDULES}/s-1/generation`,
		]);
		expect(calls[0]?.body).toBeUndefined();
	});
});

describe("schedule refusals", () => {
	const t = authTestI18n.t;
	const problem = (status: number, errorCode: string): ApiProblemError =>
		new ApiProblemError({
			status,
			errorCode,
			fieldErrors: [],
			reason: "http",
			message: errorCode,
		});

	it("puts a period that isn't a Monday on the period", () => {
		expect(
			scheduleRefusal(problem(400, "SCHEDULE_PERIOD_NOT_MONDAY"), true, t)
				.fields
		).toEqual({ periodStart: "Choose a period that starts on a Monday." });
	});

	it("explains a schedule that is no longer a draft, and a ticked shift that is gone", () => {
		expect(
			scheduleRefusal(problem(409, "SCHEDULE_NOT_DRAFT"), false, t).message
		).toBe("This schedule is no longer a draft, so it can’t be changed.");
		expect(
			scheduleRefusalMessage(problem(404, "SHIFT_NOT_FOUND"), false, t)
		).toBe("A chosen shift no longer exists. Check the shifts and try again.");
	});

	it("explains a ticked constraint that is gone or inactive", () => {
		expect(
			scheduleRefusalMessage(problem(404, "CONSTRAINT_NOT_FOUND"), false, t)
		).toBe(
			"A chosen constraint no longer exists. Check the constraints and try again."
		);
		expect(
			scheduleRefusalMessage(problem(409, "CONSTRAINT_INACTIVE"), false, t)
		).toBe(
			"A chosen constraint is inactive. Untick it or make it active, then try again."
		);
	});

	it("puts a refused field into one message where no field can show it", () => {
		expect(
			scheduleRefusalMessage(
				problem(400, "SCHEDULE_PERIOD_NOT_MONDAY"),
				false,
				t
			)
		).toBe("Choose a period that starts on a Monday.");
	});

	it.each([
		[
			"SCHEDULE_HAS_NO_SHIFTS",
			409,
			"Choose at least one shift before generating this schedule.",
		],
		["SCHEDULE_NOT_DRAFT", 409, "This schedule has already been generated."],
		[
			"SCHEDULE_CONSTRAINT_UNUSABLE",
			409,
			"A chosen constraint names a shift this schedule doesn’t include or a job title that’s no longer active. Tick that shift, edit the constraint or untick it, then try again.",
		],
		["SCHEDULE_NOT_FOUND", 404, "This draft no longer exists."],
		[
			"ACCESS_DENIED",
			403,
			"You no longer have permission to generate this schedule.",
		],
	])("explains a generation refused with %s", (code, status, copy) => {
		expect(generationRefusal(problem(status, code), t)).toBe(copy);
	});

	it("falls back to a plain failure for generation", () => {
		expect(generationRefusal(new Error("offline"), t)).toBe(
			"We couldn’t generate the schedule. Try again."
		);
	});
});
