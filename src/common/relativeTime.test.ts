import { describe, expect, it } from "vitest";
import { timeAgo } from "@/common/relativeTime";

describe("timeAgo", () => {
	const now = new Date("2026-10-03T12:00:00Z");

	it.each([
		["2026-10-03T11:59:30Z", undefined],
		["2026-10-03T11:58:00Z", "2 minutes ago"],
		["2026-10-03T10:00:00Z", "2 hours ago"],
		["2026-10-02T09:00:00Z", "Yesterday"],
		["2026-09-28T12:00:00Z", "5 days ago"],
		["2026-09-12T12:00:00Z", "3 weeks ago"],
		["2026-06-01T12:00:00Z", "4 months ago"],
		["2024-10-01T12:00:00Z", "2 years ago"],
		["2026-10-03T12:05:00Z", undefined],
	])("reads %s as %s", (occurredAt, expected) => {
		expect(timeAgo(occurredAt, now, "en")).toBe(expected);
	});

	it("capitalises in the given locale", () => {
		expect(timeAgo("2026-10-02T09:00:00Z", now, "es")).toBe("Ayer");
	});
});
