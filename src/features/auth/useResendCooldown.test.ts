import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
	formatCooldown,
	useResendCooldown,
} from "@/features/auth/useResendCooldown";

afterEach(() => {
	vi.useRealTimers();
});

it.each([
	[60, "1:00"],
	[59, "0:59"],
	[5, "0:05"],
	[0, "0:00"],
	[-3, "0:00"],
	[90.2, "1:31"],
])("formats %s seconds as %s", (seconds, expected) => {
	expect(formatCooldown(seconds)).toBe(expected);
});

it("starts inactive when asked, and restart begins a full wait", () => {
	vi.useFakeTimers();
	const { result } = renderHook(() =>
		useResendCooldown({ seconds: 3, startActive: false })
	);
	expect(result.current.active).toBe(false);
	expect(vi.getTimerCount()).toBe(0);
	act(() => {
		result.current.restart();
	});
	expect(result.current).toMatchObject({ active: true, remainingSeconds: 3 });
});

it("counts down once a second and stops its timer at zero", () => {
	vi.useFakeTimers();
	const { result } = renderHook(() =>
		useResendCooldown({ seconds: 3, startActive: true })
	);
	expect(result.current.remainingSeconds).toBe(3);
	act(() => {
		vi.advanceTimersByTime(1000);
	});
	expect(result.current.remainingSeconds).toBe(2);
	act(() => {
		vi.advanceTimersByTime(2000);
	});
	expect(result.current).toMatchObject({ active: false, remainingSeconds: 0 });
	expect(vi.getTimerCount()).toBe(0);
});

it("restarts from the full wait while counting", () => {
	vi.useFakeTimers();
	const { result } = renderHook(() =>
		useResendCooldown({ seconds: 3, startActive: true })
	);
	act(() => {
		vi.advanceTimersByTime(2000);
	});
	act(() => {
		result.current.restart();
	});
	expect(result.current.remainingSeconds).toBe(3);
	expect(vi.getTimerCount()).toBe(1);
});

it("clears its timer on unmount", () => {
	vi.useFakeTimers();
	const { unmount } = renderHook(() =>
		useResendCooldown({ seconds: 3, startActive: true })
	);
	expect(vi.getTimerCount()).toBe(1);
	unmount();
	expect(vi.getTimerCount()).toBe(0);
});
