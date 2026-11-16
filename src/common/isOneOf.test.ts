import { describe, expect, it } from "vitest";
import { isOneOf } from "@/common/isOneOf";

const SIZES = ["S", "M", "L"] as const;

describe("isOneOf", () => {
	it("given_aMemberOfTheList_when_asked_then_true", () => {
		expect(isOneOf(SIZES, "M")).toBe(true);
	});

	it("given_aValueTheListLacks_when_asked_then_false", () => {
		expect(isOneOf(SIZES, "XL")).toBe(false);
		expect(isOneOf(SIZES, "")).toBe(false);
	});
});
