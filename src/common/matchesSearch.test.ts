import { describe, expect, it } from "vitest";
import { matchesSearch } from "@/common/matchesSearch";

describe("matchesSearch", () => {
	it("given_aSearchInAnyCaseWithOuterSpaces_when_matched_then_findsTheName", () => {
		expect(matchesSearch("Front Office", "  front ")).toBe(true);
	});

	it("given_aSearchTheNameLacks_when_matched_then_false", () => {
		expect(matchesSearch("Front Office", "kitchen")).toBe(false);
	});

	it("given_anEmptySearch_when_matched_then_everyNameMatches", () => {
		expect(matchesSearch("Front Office", " ")).toBe(true);
	});
});
