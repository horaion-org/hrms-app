import { describe, expect, it, vi } from "vitest";
import {
	rememberClosed,
	rememberedClosed,
} from "@/features/scheduling/sectionFolds";

describe("rememberedClosed and rememberClosed", () => {
	it("given_aRememberedChoice_when_read_then_itsSectionNames", () => {
		const storage = { getItem: vi.fn(() => '["STAFFING","COMPANY"]') };

		expect(rememberedClosed("key", storage)).toEqual(["STAFFING", "COMPANY"]);
	});

	it("given_nothingRememberedOrUnreadable_when_read_then_none", () => {
		expect(rememberedClosed("key", { getItem: () => null })).toBeUndefined();
		expect(rememberedClosed("key", { getItem: () => "{oops" })).toBeUndefined();
		expect(
			rememberedClosed("key", {
				getItem: () => {
					throw new Error("blocked");
				},
			})
		).toBeUndefined();
	});

	it("given_closedSections_when_remembered_then_storedAsAList_andAFailureIsIgnored", () => {
		const setItem = vi.fn();
		rememberClosed("key", ["STAFFING"], { setItem });

		expect(setItem).toHaveBeenCalledWith("key", '["STAFFING"]');
		expect(() => {
			rememberClosed("key", [], {
				setItem: () => {
					throw new Error("full");
				},
			});
		}).not.toThrow();
	});
});
