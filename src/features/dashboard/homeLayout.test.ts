import { describe, expect, it } from "vitest";
import { cardSpans, sectionStateOf } from "@/features/dashboard/homeLayout";

describe("sectionStateOf", () => {
	it("is a card with rows or a failure, and no card with nothing to act on", () => {
		expect(sectionStateOf("ready", 3)).toBe("content");
		expect(sectionStateOf("error", 0)).toBe("content");
		expect(sectionStateOf("ready", 0)).toBe("empty");
	});

	it("shows nothing while out of reach or not yet known", () => {
		expect(sectionStateOf("hidden", 0)).toBe("hidden");
		expect(sectionStateOf("pending", 0)).toBe("pending");
	});
});

describe("cardSpans", () => {
	it("puts two cards to a row", () => {
		expect([
			...cardSpans([
				"short-shifts",
				"leave-to-decide",
				"next-roster",
				"cover-offers",
			]),
		]).toEqual([
			["short-shifts", "half"],
			["leave-to-decide", "half"],
			["next-roster", "half"],
			["cover-offers", "half"],
		]);
	});

	it("gives the first card the whole row when their number is odd, so none sits alone", () => {
		expect([
			...cardSpans(["leave-to-decide", "next-roster", "people-events"]),
		]).toEqual([
			["leave-to-decide", "full"],
			["next-roster", "half"],
			["people-events", "half"],
		]);
		expect([...cardSpans(["cover-offers"])]).toEqual([
			["cover-offers", "full"],
		]);
	});
});
