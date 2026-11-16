import { describe, expect, it } from "vitest";
import { weekPassed } from "./weekPassed";

const WEEK = { periodEnd: "2026-11-15", timeZone: "Asia/Singapore" };

describe("weekPassed", () => {
	it("keeps the week open on its Sunday in the branch's time zone", () => {
		expect(weekPassed(WEEK, new Date("2026-11-15T15:59:00Z"))).toBe(false);
	});

	it("passes the week from the day after its Sunday in the branch's time zone", () => {
		expect(weekPassed(WEEK, new Date("2026-11-15T16:00:00Z"))).toBe(true);
	});
});
