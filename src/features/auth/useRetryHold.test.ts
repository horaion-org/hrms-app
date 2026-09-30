import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { retryMessage, useRetryHold } from "@/features/auth/useRetryHold";

afterEach(() => {
	vi.useRealTimers();
});
it.each([
	[undefined, { kind: "later" }],
	[NaN, { kind: "later" }],
	[Infinity, { kind: "later" }],
	[-1, { kind: "later" }],
	[0, { kind: "about-a-minute" }],
	[30, { kind: "about-a-minute" }],
	[59, { kind: "about-a-minute" }],
	[60, { kind: "minutes", count: 1 }],
	[61, { kind: "minutes", count: 2 }],
	[3600, { kind: "minutes", count: 60 }],
])("rounds %s seconds for the message", (seconds, expected) => {
	expect(retryMessage(seconds)).toEqual(expected);
});
const refusal = (seconds: number, status = 429): ApiProblemError =>
	new ApiProblemError({
		status,
		retryAfterSeconds: seconds,
		reason: "rate-limited",
		message: "Refused",
		fieldErrors: [],
	});
it("uses one timeout, replaces it for a new failure, and cleans up on unmount", () => {
	vi.useFakeTimers();
	const first = refusal(30);
	const { result, rerender, unmount } = renderHook(
		({ error }) => useRetryHold(error),
		{ initialProps: { error: first } }
	);
	expect(result.current.held).toBe(true);
	expect(vi.getTimerCount()).toBe(1);
	act(() => {
		vi.advanceTimersByTime(30_000);
	});
	expect(result.current.held).toBe(false);
	expect(vi.getTimerCount()).toBe(0);
	rerender({ error: refusal(61) });
	expect(result.current.held).toBe(true);
	expect(vi.getTimerCount()).toBe(1);
	rerender({ error: refusal(3600) });
	expect(vi.getTimerCount()).toBe(1);
	unmount();
	expect(vi.getTimerCount()).toBe(0);
});
it("ignores Retry-After on a non-429 error", () => {
	vi.useFakeTimers();
	const { result } = renderHook(() => useRetryHold(refusal(60, 503)));
	expect(result.current.held).toBe(false);
	expect(vi.getTimerCount()).toBe(0);
});
