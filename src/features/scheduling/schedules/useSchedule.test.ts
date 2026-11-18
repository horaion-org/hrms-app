import { describe, expect, it } from "vitest";
import { readAgainOnEntry } from "@/features/scheduling/schedules/useSchedule";

describe("readAgainOnEntry", () => {
	const NOW = 1_000_000;

	/** The route reads the schedule a moment before the page mounts; anything older was cached before the visit. */
	it.each([
		["a read made as the page opened", NOW, false],
		["a read made a second ago, by the route", NOW - 1_000, false],
		["a read from 16 seconds ago, on another page", NOW - 16_000, true],
		["a read from before a reload of the cache", 0, true],
	])("%s is read again: %s", (_, readAt, expected) => {
		expect(readAgainOnEntry(readAt, NOW)).toBe(expected);
	});
});
