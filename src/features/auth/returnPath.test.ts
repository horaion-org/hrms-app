import { describe, expect, it } from "vitest";
import { returnPath } from "@/features/auth/returnPath";

describe("returnPath", () => {
	it.each(["/", "/settings/security", "/companies?tab=members#top"])(
		"keeps the in-app path %s",
		(path) => {
			expect(returnPath(path)).toBe(path);
		}
	);

	it.each([
		undefined,
		42,
		"",
		"settings",
		"https://evil.test",
		"//evil.test",
		"/\\evil.test",
	])("sends %s home", (value) => {
		expect(returnPath(value)).toBe("/");
	});

	it.each([
		["a tab", "/\t/evil.test"],
		["a newline", "/\n/evil.test"],
		["a carriage return", "/settings\r"],
		["a NUL", "/settings\u0000"],
		["a C1 control", "/settings\u0085"],
		["a space", "/ /evil.test"],
		["a non-breaking space", "/settings "],
	])("sends a path with %s home", (_label, value) => {
		expect(returnPath(value)).toBe("/");
	});
});
