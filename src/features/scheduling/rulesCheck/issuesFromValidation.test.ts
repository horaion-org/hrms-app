import { describe, expect, it } from "vitest";
import {
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	brokenRuleIssueCount,
	findingsShown,
	generationStoredGap,
	validationStanding,
} from "@/features/scheduling/rulesCheck/issuesFromValidation";
import { generationFindingsFixture } from "@/features/scheduling/schedules/fixtures";
import { shiftCopyId } from "@/features/scheduling/shifts/fixtures";

const findings = generationFindingsFixture();

describe("validationStanding", () => {
	it.each([
		[
			"as generated, never changed nor validated",
			undefined,
			false,
			"asGenerated",
		],
		[
			"out of date, changed by hand and never validated",
			undefined,
			true,
			"outOfDate",
		],
		["out of date, validated at an earlier revision", 0, false, "outOfDate"],
		["current, validated at the revision on screen", 1, true, "current"],
	] as const)("reads %s", (_case, lastRevision, hasChanges, expected) => {
		expect(
			validationStanding({
				revision: 1,
				last:
					lastRevision === undefined
						? undefined
						: { revision: lastRevision, check: rulesCheckFixture() },
				hasChanges,
			})
		).toBe(expected);
	});
});

describe("findingsShown", () => {
	it("keeps the generation's findings when nothing was validated or staffing was not worked out", () => {
		expect(findingsShown(findings, undefined)).toBe(findings);
		expect(
			findingsShown(findings, {
				revision: 1,
				check: rulesCheckFixture({ staffingGaps: null }),
			})
		).toBe(findings);
	});

	it("puts the validation's gaps in place of the generation's conflicts, keeping its other findings", () => {
		const gap = staffingGapFixture({ conflictId: "new" });

		const shown = findingsShown(findings, {
			revision: 1,
			check: rulesCheckFixture({ staffingGaps: [gap] }),
		});

		expect(shown?.conflicts).toEqual([gap]);
		expect(shown?.diagnostics).toEqual(findings.diagnostics);
	});
});

describe("brokenRuleIssueCount", () => {
	it("counts one per rule named, one when broken with none named, none otherwise", () => {
		const broken = rulesCheckFixture({
			status: "BROKEN",
			brokenRules: [
				{ rule: "most_days_a_week", constraintId: null, constraintName: null },
				{
					rule: "most_minutes_a_day",
					constraintId: null,
					constraintName: null,
				},
			],
		});
		expect(brokenRuleIssueCount({ revision: 1, check: broken })).toBe(2);
		expect(
			brokenRuleIssueCount({
				revision: 1,
				check: rulesCheckFixture({ status: "BROKEN" }),
			})
		).toBe(1);
		expect(brokenRuleIssueCount(undefined)).toBe(0);
	});
});

describe("generationStoredGap", () => {
	it("finds a gap the generation stored for the shift and day, and none a hand edit made", () => {
		const frontDesk = shiftCopyId("front-desk-am");
		expect(
			generationStoredGap(findings, { shiftId: frontDesk, day: "2026-10-17" })
		).toBe(true);
		expect(
			generationStoredGap(findings, { shiftId: frontDesk, day: "2026-10-18" })
		).toBe(false);
		expect(
			generationStoredGap(null, { shiftId: frontDesk, day: "2026-10-17" })
		).toBe(false);
	});
});
