import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import type { RosterCell } from "@/features/scheduling/roster/roster";
import { morningShift } from "@/features/scheduling/timeline/fixtures";
import {
	barContentOf,
	cellLinesOf,
	ZOOM_LOOKS,
} from "@/features/scheduling/timeline/timelineLooks";

const t = authTestI18n.t.bind(authTestI18n);
const restDay: RosterCell = { kind: "off", dayType: "REST" };

describe("barContentOf", () => {
	it.each([
		["week", 1, { showsName: true, showsBadge: false }],
		["week", 3, { showsName: true, showsBadge: true }],
		["two", 4, { showsName: true, showsBadge: false }],
		["two", 5, { showsName: true, showsBadge: true }],
		["four", 2, { showsName: false, showsBadge: false }],
		["four", 3, { showsName: true, showsBadge: false }],
		["four", 28, { showsName: true, showsBadge: false }],
	] as const)("a %s bar %i days wide shows %j", (view, span, expected) => {
		expect(barContentOf(view, span)).toEqual(expected);
	});
});

describe("cellLinesOf", () => {
	it.each([
		["week", morningShift("a-1"), ["09:00 – 17:00", "Morning"]],
		["two", morningShift("a-1"), ["Morning"]],
		["four", morningShift("a-1"), ["M"]],
		["week", restDay, ["Rest day"]],
		["four", restDay, ["R"]],
	] as const)("a %s cell shows its lines", (view, cell, expected) => {
		expect(cellLinesOf(cell, view, t)).toEqual(expected);
	});
});

describe("ZOOM_LOOKS", () => {
	it.each([
		["week", "noSchedule", true],
		["two", "dash", true],
		["four", "dot", false],
	] as const)(
		"%s marks an empty day as %s; staff details %s",
		(view, mark, details) => {
			expect(ZOOM_LOOKS[view].emptyDay).toBe(mark);
			expect(ZOOM_LOOKS[view].staffDetails).toBe(details);
			expect(
				authTestI18n.exists(`scheduling.timeline.grid.emptyDay.${mark}`)
			).toBe(true);
		}
	);
});
