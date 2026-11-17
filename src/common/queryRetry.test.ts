import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { queryClient } from "@/common/query-client";
import {
	retry,
	retryDelay,
	STALE_RETRIES,
	STALE_RETRY_DELAY_MS,
} from "@/common/queryRetry";

const problem = (status: number, errorCode?: string): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

const stale = problem(503, "DECISION_ENGINE_STALE");

describe("retry", () => {
	it("retries a stale decision engine every 2 seconds for 20 seconds, then stops", () => {
		expect(retry(0, stale)).toBe(true);
		expect(retry(STALE_RETRIES - 1, stale)).toBe(true);
		expect(retry(STALE_RETRIES, stale)).toBe(false);
		expect(retryDelay(0, stale)).toBe(STALE_RETRY_DELAY_MS);
		expect(retryDelay(STALE_RETRIES - 1, stale)).toBe(STALE_RETRY_DELAY_MS);
		expect(STALE_RETRIES * STALE_RETRY_DELAY_MS).toBe(20_000);
	});

	it("retries an outage three times on a doubling wait", () => {
		const outage = new Error("Failed to fetch");
		expect(retry(0, outage)).toBe(true);
		expect(retry(2, outage)).toBe(true);
		expect(retry(3, outage)).toBe(false);
		expect([0, 1, 2].map((count) => retryDelay(count, outage))).toEqual([
			1_000, 2_000, 4_000,
		]);
	});

	it("retries any other 503 only three times", () => {
		expect(retry(2, problem(503, "SERVICE_UNAVAILABLE"))).toBe(true);
		expect(retry(3, problem(503, "SERVICE_UNAVAILABLE"))).toBe(false);
	});

	it("never retries a refusal or a bad request", () => {
		expect(retry(0, problem(403, "FORBIDDEN"))).toBe(false);
		expect(retry(0, problem(400, "VALIDATION_FAILED"))).toBe(false);
		expect(retry(0, problem(404))).toBe(false);
	});
});

describe("the app's query client", () => {
	it("retries every read by the shared rule and never repeats a write", () => {
		const defaults = queryClient.getDefaultOptions();
		expect(defaults.queries?.retry).toBe(retry);
		expect(defaults.queries?.retryDelay).toBe(retryDelay);
		expect(defaults.mutations?.retry).toBeUndefined();
	});
});
