import { describe, expect, it } from "vitest";
import type { Finding } from "@/features/scheduling/roster/findings/finding";
import {
	cellKey,
	placeFindings,
} from "@/features/scheduling/roster/findings/findingsOnGrid";
import {
	emptyFindingsFixture,
	findingsOfEveryKindFixture,
	priorRestDiagnosticFixture,
} from "@/features/scheduling/schedules/fixtures";

const WEEK = [
	"2026-10-12",
	"2026-10-13",
	"2026-10-14",
	"2026-10-15",
	"2026-10-16",
	"2026-10-17",
	"2026-10-18",
];

const summary = (finding: Finding): string => {
	if (finding.kind === "conflict") return finding.conflict.conflictId;
	if (finding.kind === "message") return finding.message;
	return finding.diagnostic.code;
};

const summaries = (
	map: ReadonlyMap<string, Array<Finding>>
): Record<string, Array<string>> =>
	Object.fromEntries(
		[...map].map(([key, findings]) => [key, findings.map(summary)])
	);

describe("placeFindings", () => {
	it("given_aWeekOfFindings_when_placed_then_marksCellsRowsAndDays", () => {
		const placed = placeFindings(findingsOfEveryKindFixture(), WEEK);

		expect(summaries(placed.byCell)).toEqual({
			[cellKey("m-3", "2026-10-18")]: [
				"Chen Wei covers the Sunday swing alone.",
			],
		});
		expect(summaries(placed.byRow)).toEqual({
			"m-2": [
				"cf-4",
				"Ben Ong works more than five days in a row.",
				"UNASSIGNABLE_EMPLOYEE",
			],
		});
		expect(summaries(placed.byDate)).toEqual({
			"2026-10-16": ["cf-2", "cf-3", "Friday is short of one Cashier."],
			"2026-10-17": ["cf-1"],
		});
	});

	it("given_onlySomeDaysInView_when_placed_then_leavesOtherDaysUnmarked", () => {
		const placed = placeFindings(
			findingsOfEveryKindFixture(),
			WEEK.slice(0, 5)
		);

		expect(placed.byCell.size).toBe(0);
		expect(summaries(placed.byDate)).toEqual({
			"2026-10-16": ["cf-2", "cf-3", "Friday is short of one Cashier."],
		});
		expect(summaries(placed.byRow)["m-2"]).toEqual([
			"Ben Ong works more than five days in a row.",
			"UNASSIGNABLE_EMPLOYEE",
		]);
	});

	it("given_setupDiagnosticsOrAnUnresolvedMember_when_placed_then_leavesThemToThePanel", () => {
		const placed = placeFindings(findingsOfEveryKindFixture(), WEEK);
		const everything = [
			...placed.byCell.values(),
			...placed.byRow.values(),
			...placed.byDate.values(),
		]
			.flat()
			.map(summary);

		expect(everything).not.toContain("UNCOVERABLE_DEMAND");
		expect(everything).not.toContain("DEAD_SHIFT");
		expect(everything).not.toContain("RULE_REFERENCES_MISSING_ENTITY");
		expect(everything).not.toContain("An unknown member is short of rest.");
	});

	it("given_restAfterLastWeek_when_placed_then_marksTheMembersRow", () => {
		const findings = {
			...emptyFindingsFixture(),
			members: findingsOfEveryKindFixture().members,
			diagnostics: [priorRestDiagnosticFixture()],
		};

		expect(summaries(placeFindings(findings, WEEK).byRow)).toEqual({
			"m-2": ["PRIOR_REST_BLOCKS_SHIFTS"],
		});
	});

	it("given_nothingFound_when_placed_then_marksNothing", () => {
		const placed = placeFindings(emptyFindingsFixture(), WEEK);

		expect([placed.byCell.size, placed.byRow.size, placed.byDate.size]).toEqual(
			[0, 0, 0]
		);
	});
});
