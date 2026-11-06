import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchPublishedWeek,
	publishedRosterOtherThan,
	publishedWeekQuery,
} from "@/features/scheduling/publishedWeek/api";

const UNIT = { branchId: "b-1", departmentId: "d-1" };
const PUBLISHED_WEEK =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/published-week";

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

describe("published week client", () => {
	it("asks the department's week by its Monday and reads the published schedule", async () => {
		const calls = stubApi({
			[`GET ${PUBLISHED_WEEK}`]: {
				status: 200,
				body: envelope({ periodStart: "2026-11-09", scheduleId: "s-9" }),
			},
		});

		const week = await fetchPublishedWeek("c-1", UNIT, "2026-11-09");

		expect(week).toEqual({ periodStart: "2026-11-09", scheduleId: "s-9" });
		expect(calls[0]?.search).toBe("periodStart=2026-11-09");
	});

	it("reads a week without a published roster, its id null or left out, as null", async () => {
		stubApi({
			[`GET ${PUBLISHED_WEEK}`]: [
				{
					status: 200,
					body: envelope({ periodStart: "2026-11-09", scheduleId: null }),
				},
				{
					status: 200,
					body: envelope({ periodStart: "2026-11-09", extra: true }),
				},
			],
		});

		expect(
			(await fetchPublishedWeek("c-1", UNIT, "2026-11-09")).scheduleId
		).toBeNull();
		expect(
			(await fetchPublishedWeek("c-1", UNIT, "2026-11-09")).scheduleId
		).toBeNull();
	});

	it("asks nothing without a department the person may read, or without a week", () => {
		expect(
			typeof publishedWeekQuery("c-1", undefined, "2026-11-09").queryFn
		).not.toBe("function");
		expect(typeof publishedWeekQuery("c-1", UNIT, undefined).queryFn).not.toBe(
			"function"
		);
		expect(typeof publishedWeekQuery("c-1", UNIT, "2026-11-09").queryFn).toBe(
			"function"
		);
	});
});

describe("publishedRosterOtherThan", () => {
	const week = { periodStart: "2026-11-09", scheduleId: "s-9" };

	it("names the published roster that holds the week", () => {
		expect(publishedRosterOtherThan(week, "s-1")).toBe("s-9");
		expect(publishedRosterOtherThan(week)).toBe("s-9");
	});

	it("never names the schedule itself, a free week or an unknown one", () => {
		expect(publishedRosterOtherThan(week, "s-9")).toBeUndefined();
		expect(
			publishedRosterOtherThan({ periodStart: "2026-11-09", scheduleId: null })
		).toBeUndefined();
		expect(publishedRosterOtherThan(undefined, "s-1")).toBeUndefined();
	});
});
