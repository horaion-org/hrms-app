import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	stretchHoursMark,
	stretchOvertimeText,
} from "@/features/scheduling/shifts/stretchWords";

const t = authTestI18n.t;

describe("stretchHoursMark", () => {
	it.each<[number | undefined, string | undefined]>([
		[120, "+2 h"],
		[90, "+1.5 h"],
		[30, "+0.5 h"],
		[0, undefined],
		[undefined, undefined],
	])("marks %s minutes as %s", (minutes, mark) => {
		expect(stretchHoursMark(minutes, t)).toBe(mark);
	});
});

describe("stretchOvertimeText", () => {
	it.each<[number, string]>([
		[120, "+2 h overtime"],
		[90, "+1.5 h overtime"],
	])("words %s minutes as %s", (minutes, text) => {
		expect(stretchOvertimeText(minutes, t)).toBe(text);
	});
});
