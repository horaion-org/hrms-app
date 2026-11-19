import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { guardedRead } from "@/features/dashboard/guardedRead";

const READY = { status: "ready" } as const;
const answered = { data: [1], error: null, isError: false };

/** A refusal as the API client throws it. */
const refusal = (status: number): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode: undefined,
		fieldErrors: [],
		reason: "http",
	});

describe("guardedRead", () => {
	it("waits for the workspace, then hides what the grants don't reach", () => {
		expect(guardedRead({ status: "pending" }, true, answered)).toEqual({
			status: "pending",
		});
		expect(guardedRead(READY, false, answered)).toEqual({ status: "hidden" });
	});

	it("hides a refusal and reports any other failure", () => {
		expect(
			guardedRead(READY, true, {
				data: undefined,
				error: refusal(403),
				isError: true,
			})
		).toEqual({ status: "hidden" });
		expect(
			guardedRead(READY, true, {
				data: undefined,
				error: refusal(500),
				isError: true,
			})
		).toEqual({ status: "error" });
	});

	it("is pending until answered, then ready with the answer", () => {
		expect(
			guardedRead(READY, true, { data: undefined, error: null, isError: false })
		).toEqual({ status: "pending" });
		expect(guardedRead(READY, true, answered)).toEqual({
			status: "ready",
			data: [1],
		});
	});
});
