import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useNow } from "@/common/useNow";

afterEach(() => {
	vi.useRealTimers();
});

it("renews the time on each interval and stops when unmounted", () => {
	vi.useFakeTimers({ now: new Date("2026-11-04T09:00:00Z") });
	const { result, unmount } = renderHook(() => useNow(60_000));
	expect(result.current.toISOString()).toBe("2026-11-04T09:00:00.000Z");
	act(() => {
		vi.advanceTimersByTime(60_000);
	});
	expect(result.current.toISOString()).toBe("2026-11-04T09:01:00.000Z");
	unmount();
	expect(vi.getTimerCount()).toBe(0);
});
