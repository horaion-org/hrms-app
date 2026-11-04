import { describe, expect, it } from "vitest";
import {
	findingCounts,
	hasFindings,
} from "@/features/scheduling/roster/findings/findingCounts";
import {
	emptyFindingsFixture,
	findingsOfEveryKindFixture,
	generationFindingsFixture,
} from "@/features/scheduling/schedules/fixtures";

describe("findingCounts", () => {
	it("given_findings_when_counted_then_countsEachConflictAndMessageAndEachDiagnostic", () => {
		expect(findingCounts(generationFindingsFixture())).toEqual({
			roster: 3,
			setup: 1,
		});
		expect(findingCounts(findingsOfEveryKindFixture())).toEqual({
			roster: 8,
			setup: 5,
		});
	});

	it("given_errorsWithSeveralMessages_when_counted_then_countsEachMessage", () => {
		const findings = generationFindingsFixture({
			errors: [{ employeeId: "mp-1", date: null, messages: ["One.", "Two."] }],
		});

		expect(findingCounts(findings).roster).toBe(4);
	});

	it("given_nothingFound_when_counted_then_isZeroAndHasNoFindings", () => {
		const counts = findingCounts(emptyFindingsFixture());

		expect(counts).toEqual({ roster: 0, setup: 0 });
		expect(hasFindings(counts)).toBe(false);
		expect(hasFindings({ roster: 0, setup: 1 })).toBe(true);
	});
});
