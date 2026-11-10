import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/common/useDebouncedValue";

afterEach(() => {
	vi.useRealTimers();
});

it("starts with the value and follows it once it has settled for 250 ms", () => {
	vi.useFakeTimers();
	const { result, rerender } = renderHook(
		({ value }) => useDebouncedValue(value),
		{ initialProps: { value: "a" } }
	);
	expect(result.current).toBe("a");
	rerender({ value: "ab" });
	act(() => {
		vi.advanceTimersByTime(249);
	});
	expect(result.current).toBe("a");
	act(() => {
		vi.advanceTimersByTime(1);
	});
	expect(result.current).toBe("ab");
});

it("restarts the wait on each change, so only the last value arrives", () => {
	vi.useFakeTimers();
	const { result, rerender } = renderHook(
		({ value }) => useDebouncedValue(value, 100),
		{ initialProps: { value: "a" } }
	);
	rerender({ value: "ab" });
	act(() => {
		vi.advanceTimersByTime(60);
	});
	rerender({ value: "abc" });
	act(() => {
		vi.advanceTimersByTime(60);
	});
	expect(result.current).toBe("a");
	act(() => {
		vi.advanceTimersByTime(40);
	});
	expect(result.current).toBe("abc");
});
