import { describe, expect, it } from "vitest";
import { checkSentence } from "@/features/scheduling/rosterChanges/checkSentence";
import { rosterCheckFixture } from "@/features/scheduling/rosterChanges/fixtures";

const names = {
	member: (id: string | null): string =>
		id === "m-1" ? "Aisha Rahman" : "Someone",
	shift: (id: string | null): string =>
		id === "front-desk-am-copy" ? "Front Desk AM" : "",
	day: (date: string): string => `day ${date}`,
};

describe("checkSentence", () => {
	it("given_aCoverageCheck_when_written_then_namesTheShiftDayAndCounts", () => {
		expect(checkSentence(rosterCheckFixture(), names)).toEqual({
			key: "scheduling.rosterEdit.check.COVERAGE_CHANGED",
			values: {
				name: "Someone",
				shift: "Front Desk AM",
				day: "day 2026-10-12",
				before: 2,
				after: 1,
			},
		});
	});

	it("given_aCheckAboutAMember_when_written_then_namesThem", () => {
		const sentence = checkSentence(
			rosterCheckFixture({
				code: "NOT_AVAILABLE",
				membershipId: "m-1",
				countBefore: null,
				countAfter: null,
			}),
			names
		);

		expect(sentence.key).toBe("scheduling.rosterEdit.check.NOT_AVAILABLE");
		expect(sentence.values).toMatchObject({
			name: "Aisha Rahman",
			before: 0,
			after: 0,
		});
	});
});
