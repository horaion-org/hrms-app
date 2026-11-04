import { describe, expect, it } from "vitest";
import {
	notificationExactTime,
	notificationTimeLabel,
} from "@/features/notifications/notificationTime";

describe("notificationTimeLabel", () => {
	const now = new Date("2026-11-04T12:00:00Z");

	it.each([
		["2026-11-04T11:59:01Z", undefined],
		["2026-11-04T12:05:00Z", undefined],
		["2026-11-04T11:01:00Z", "59 minutes ago"],
		["2026-11-03T13:00:00Z", "23 hours ago"],
		["2026-11-03T11:00:00Z", "Yesterday"],
		["2026-10-28T12:00:01Z", "6 days ago"],
		["2026-10-28T12:00:00Z", "Oct 28, 2026"],
		["2025-03-01T12:00:00Z", "Mar 1, 2025"],
	])("shows %s as %s", (occurredAt, expected) => {
		expect(notificationTimeLabel(occurredAt, now, "en-US")).toBe(expected);
	});

	it("uses the given locale for both relative times and dates", () => {
		expect(notificationTimeLabel("2026-11-03T11:00:00Z", now, "es")).toBe(
			"Ayer"
		);
		expect(notificationTimeLabel("2026-10-01T12:00:00Z", now, "es")).toBe(
			"1 oct 2026"
		);
	});
});

it("gives the exact date and time for the title", () => {
	expect(notificationExactTime("2026-11-04T09:12:00Z", "en-US")).toMatch(
		/^Nov 4, 2026, \d{1,2}:12/
	);
});
