import { describe, expect, it } from "vitest";
import {
	meetsPasswordPolicy,
	unmetPasswordRules,
} from "@/features/auth/passwordRules";

describe("password rules", () => {
	it("accepts a password that meets every rule", () => {
		expect(unmetPasswordRules("Example123!")).toEqual([]);
		expect(meetsPasswordPolicy("Example123!")).toBe(true);
	});

	it("lists every unmet rule in display order", () => {
		expect(unmetPasswordRules("")).toEqual([
			"length",
			"uppercase",
			"lowercase",
			"number",
			"symbol",
		]);
		expect(unmetPasswordRules("example123")).toEqual(["uppercase", "symbol"]);
	});

	it("bounds the length at 8 to 128 characters", () => {
		expect(unmetPasswordRules("Ab1!xyz")).toEqual(["length"]);
		expect(unmetPasswordRules("Ab1!xyzw")).toEqual([]);
		expect(unmetPasswordRules(`Ab1!${"x".repeat(124)}`)).toEqual([]);
		expect(unmetPasswordRules(`Ab1!${"x".repeat(125)}`)).toEqual(["length"]);
	});

	it("counts only Cognito's symbols, a space only inside the password", () => {
		expect(meetsPasswordPolicy("Example 123")).toBe(true);
		expect(meetsPasswordPolicy("Example123 ")).toBe(false);
		expect(meetsPasswordPolicy("Example123€")).toBe(false);
	});
});
