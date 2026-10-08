import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { retry } from "@/features/workspace/retry";

const problem = (status: number, errorCode?: string): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

describe("retry", () => {
	it("retries a stale decision engine three times, outlasting one bundle poll", () => {
		const stale = problem(503, "DECISION_ENGINE_STALE");
		expect(retry(0, stale)).toBe(true);
		expect(retry(1, stale)).toBe(true);
		expect(retry(2, stale)).toBe(true);
		expect(retry(3, stale)).toBe(false);
	});

	it("retries an outage that is not an API problem", () => {
		expect(retry(0, new Error("Failed to fetch"))).toBe(true);
		expect(retry(3, new Error("Failed to fetch"))).toBe(false);
	});

	it("never retries a refusal or a bad request", () => {
		expect(retry(0, problem(403, "FORBIDDEN"))).toBe(false);
		expect(retry(0, problem(400, "VALIDATION_FAILED"))).toBe(false);
		expect(retry(0, problem(404))).toBe(false);
	});
});
