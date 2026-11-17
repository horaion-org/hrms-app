import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { queryClient } from "@/common/query-client";
import {
	retry,
	retryDelay,
	STALE_FALLBACK_DELAY_MS,
	STALE_RETRIES,
} from "@/common/queryRetry";

const problem = (status: number, errorCode?: string): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

const stale = (retryAfterSeconds?: number): ApiProblemError =>
	new ApiProblemError({
		message: "API says wait",
		status: 503,
		errorCode: "DECISION_ENGINE_STALE",
		fieldErrors: [],
		retryAfterSeconds,
		reason: "http",
	});

describe("retry", () => {
	it("retries a read refused while access is updated twice, then stops", () => {
		expect(retry(0, stale(5))).toBe(true);
		expect(retry(STALE_RETRIES - 1, stale(5))).toBe(true);
		expect(retry(STALE_RETRIES, stale(5))).toBe(false);
	});

	it("waits the API's Retry-After before each such retry", () => {
		expect(retryDelay(0, stale(5))).toBe(5_000);
		expect(retryDelay(1, stale(3))).toBe(3_000);
	});

	it("waits a short fixed time when an older API sends no Retry-After", () => {
		expect(retryDelay(0, stale())).toBe(STALE_FALLBACK_DELAY_MS);
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
