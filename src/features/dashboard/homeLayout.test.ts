import { describe, expect, it } from "vitest";
import { cardSpans, sectionStateOf } from "@/features/dashboard/homeLayout";

describe("sectionStateOf", () => {
	it("is a card with rows or a failure, and a sentence with nothing to act on", () => {
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
	it("gives the lead card the row and pairs the rest", () => {
		expect([
			...cardSpans(["short-shifts", "leave-to-decide", "next-roster"]),
		]).toEqual([
			["short-shifts", "full"],
			["leave-to-decide", "half"],
			["next-roster", "half"],
		]);
	});

	it("gives a card left without a neighbour the whole row", () => {
		expect([
			...cardSpans(["leave-to-decide", "next-roster", "people-events"]),
		]).toEqual([
			["leave-to-decide", "half"],
			["next-roster", "half"],
			["people-events", "full"],
		]);
		expect([...cardSpans(["cover-offers"])]).toEqual([
			["cover-offers", "full"],
		]);
	});
});
