import { describe, expect, it } from "vitest";
import {
	parseMyRosterDaysSearch,
	stepWindow,
	windowFrom,
} from "@/features/scheduling/myRoster/myRosterDays";

describe("parseMyRosterDaysSearch", () => {
	it.each([
		{ search: { from: "2026-10-12" }, parsed: { from: "2026-10-12" } },
		{ search: { from: "2026-10-13" }, parsed: {} },
		{ search: { from: "not a date" }, parsed: {} },
		{ search: { from: 42 }, parsed: {} },
		{ search: {}, parsed: {} },
	])("reads $search as $parsed", ({ search, parsed }) => {
		expect(parseMyRosterDaysSearch(search)).toEqual(parsed);
	});
});

describe("windowFrom", () => {
	it.each([
		{ monday: "2026-10-12", end: "2026-10-25" },
		{ monday: "2026-12-28", end: "2027-01-10" },
	])("shows two weeks from $monday to $end", ({ monday, end }) => {
		expect(windowFrom(monday)).toEqual({ start: monday, end });
	});
});

describe("stepWindow", () => {
	it.each([
		{ monday: "2026-10-12", step: 1 as const, next: "2026-10-26" },
		{ monday: "2026-10-12", step: -1 as const, next: "2026-09-28" },
		{ monday: "2026-12-28", step: 1 as const, next: "2027-01-11" },
	])("moves $step from $monday to $next", ({ monday, step, next }) => {
		expect(stepWindow(monday, step)).toBe(next);
	});
});
