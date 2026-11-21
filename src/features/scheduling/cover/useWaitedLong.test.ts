import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWaitedLong } from "@/features/scheduling/cover/useWaitedLong";

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("useWaitedLong", () => {
	it("turns true once the wait has held that long, and false as soon as it stops", () => {
		const { result, rerender } = renderHook(
			({ active }) => useWaitedLong(active, 8_000),
			{ initialProps: { active: true } }
		);

		act(() => {
			vi.advanceTimersByTime(7_999);
		});
		expect(result.current).toBe(false);
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toBe(true);

		rerender({ active: false });
		expect(result.current).toBe(false);
		rerender({ active: true });
		expect(result.current).toBe(false);
	});
});
