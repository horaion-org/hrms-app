import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { ApiProblemError, UnexpectedResponseError } from "@/common/problem";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	createSchedule,
	fetchSchedule,
	updateSchedule,
	type ScheduleBody,
} from "@/features/scheduling/schedules/api";
import { scheduleFixture } from "@/features/scheduling/schedules/fixtures";
import { scheduleRefusal } from "@/features/scheduling/schedules/scheduleRefusal";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const SCHEDULES =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules";

const BODY: ScheduleBody = {
	name: "Front Office - Week 42",
	periodStart: "2026-10-12",
	includeLeave: true,
	allowOpenShifts: false,
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

	it("reads and replaces one schedule at its department", async () => {
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
});

describe("scheduleRefusal", () => {
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

	it("explains a schedule that is no longer a draft", () => {
		expect(
			scheduleRefusal(problem(409, "SCHEDULE_NOT_DRAFT"), false, t).message
		).toBe("This schedule is no longer a draft, so it can’t be changed.");
	});
});
