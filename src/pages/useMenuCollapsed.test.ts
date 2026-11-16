import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	isMenuCollapsed,
	MENU_COLLAPSED_KEY,
	rememberMenuCollapsed,
	useMenuCollapsed,
} from "@/pages/useMenuCollapsed";

/** A storage whose every call throws, as in a browser that blocks site data. */
const blockedStorage = {
	getItem: (): string | null => {
		throw new Error("blocked");
	},
	setItem: (): void => {
		throw new Error("blocked");
	},
};

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe("isMenuCollapsed", () => {
	it("reads expanded when nothing is stored", () => {
		expect(isMenuCollapsed()).toBe(false);
	});

	it("reads the stored choice", () => {
		localStorage.setItem(MENU_COLLAPSED_KEY, "true");
		expect(isMenuCollapsed()).toBe(true);
	});

	it("reads expanded when storage throws", () => {
		expect(isMenuCollapsed(blockedStorage)).toBe(false);
	});
});

describe("rememberMenuCollapsed", () => {
	it("stores the choice", () => {
		rememberMenuCollapsed(true);
		expect(localStorage.getItem(MENU_COLLAPSED_KEY)).toBe("true");
	});

	it("does not throw when storage throws", () => {
		expect(() => {
			rememberMenuCollapsed(true, blockedStorage);
		}).not.toThrow();
	});
});

describe("useMenuCollapsed", () => {
	it("still toggles for this visit when storage throws", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(
			blockedStorage.getItem
		);
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(
			blockedStorage.setItem
		);
		const { result } = renderHook(() => useMenuCollapsed());
		expect(result.current.collapsed).toBe(false);

		act(() => {
			result.current.toggleCollapsed();
		});
		expect(result.current.collapsed).toBe(true);
	});
});
