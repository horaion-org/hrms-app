import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	ruleFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	issueCounts,
	issueSummary,
	issuesOfGroup,
	orderedIssues,
	rosterIssues,
	type RosterIssueInput,
} from "./rosterIssueGroups";

/** Echoes the key and its values, so items can be read without copy. */
const t = ((key: string, values?: Record<string, unknown>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;

const input = (
	overrides: Partial<RosterIssueInput> = {}
): RosterIssueInput => ({
	gaps: [],
	brokenMusts: [],
	notMet: [],
	notes: [],
	memberNames: new Map([
		["mp-1", "Aisha Rahman"],
		["mp-2", "Ben Ortiz"],
	]),
	roleNames: new Map([["front-desk-staff", "Front Desk Staff"]]),
	ruleNames: new Map(),
	t,
	...overrides,
});

const brokenMust = ruleFixture({
	constraintName: "Rest between shifts",
	violations: [
		{ employeeId: "mp-2", date: "2026-10-14", messages: [] },
		{ employeeId: "mp-1", date: "2026-10-15", messages: [] },
	],
});

describe("rosterIssues", () => {
	it("lists a shift short as its job title short, its day and time, with Find cover", () => {
		const [issue] = rosterIssues(input({ gaps: [staffingGapFixture()] }));

		expect(issue).toMatchObject({
			group: "mustFix",
			who: "scheduling.issues.jobShort(Front Desk Staff)",
			day: "2026-10-17",
			time: "09:00–15:00",
			action: {
				kind: "findCover",
				gap: { day: "2026-10-17" },
			},
		});
		expect(issue?.rule).toMatch(/^scheduling\.issues\.shortOnRule\(1\|/);
	});

	it("offers Show for a gap with no shift to find cover for", () => {
		const [issue] = rosterIssues(
			input({ gaps: [staffingGapFixture({ shiftUuids: [] })] })
		);

		expect(issue?.action).toEqual({ kind: "show" });
	});

	it("lists each person and day a broken must names, to fix, by the rule's name", () => {
		const issues = rosterIssues(input({ brokenMusts: [brokenMust] }));

		expect(
			issues.map((issue) => [issue.group, issue.who, issue.day, issue.rule])
		).toEqual([
			["mustFix", "Ben Ortiz", "2026-10-14", "Rest between shifts"],
			["mustFix", "Aisha Rahman", "2026-10-15", "Rest between shifts"],
		]);
	});

	it("lists a rule naming no one once, for the whole roster", () => {
		const issues = rosterIssues(
			input({ notMet: [ruleFixture({ constraintName: "Weekends off" })] })
		);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({
			group: "notMet",
			who: "scheduling.issues.wholeRoster",
			day: null,
		});
	});

	it("words a rule the engine named with no violations, and says what to do", () => {
		const [issue] = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({ rule: "impossible_shift_assignment_is_zero" }),
				],
			})
		);

		expect(issue).toMatchObject({
			who: "scheduling.issues.wholeRoster",
			rule: "scheduling.rulesCheck.rule.impossible_shift_assignment_is_zero",
			hint: "scheduling.issues.ruleWithoutPlace",
		});
	});

	it("names the person and day of the same rule when the engine sends violations, with no hint", () => {
		const [issue] = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({
						rule: "impossible_shift_assignment_is_zero",
						violations: [
							{ employeeId: "mp-1", date: "2026-10-14", messages: [] },
						],
					}),
				],
			})
		);

		expect(issue).toMatchObject({
			who: "Aisha Rahman",
			day: "2026-10-14",
			rule: "scheduling.rulesCheck.rule.impossible_shift_assignment_is_zero",
		});
		expect(issue?.hint).toBeUndefined();
	});

	it("gives the hint only to an item with no person and no day", () => {
		const issues = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({
						violations: [
							{ employeeId: null, date: null, messages: [] },
							{ employeeId: "mp-1", date: null, messages: [] },
							{ employeeId: null, date: "2026-10-14", messages: [] },
						],
					}),
				],
			})
		);

		expect(issues.map((issue) => issue.hint)).toEqual([
			"scheduling.issues.ruleWithoutPlace",
			undefined,
			undefined,
		]);
	});

	it("lists notes for information, and nothing twice", () => {
		const issues = rosterIssues(
			input({
				brokenMusts: [brokenMust, brokenMust],
				gaps: [staffingGapFixture(), staffingGapFixture()],
				notes: ["Public holiday on Monday", "Public holiday on Monday"],
			})
		);

		expect(issueCounts(issues)).toEqual({
			mustFix: 3,
			notMet: 0,
			forInformation: 1,
		});
	});
});

describe("issueSummary", () => {
	it("says each group with items, leaving out the empty ones", () => {
		expect(issueSummary({ mustFix: 3, notMet: 0, forInformation: 1 }, t)).toBe(
			"scheduling.issues.summary.mustFix(3) · scheduling.issues.summary.forInformation(1)"
		);
	});

	it("is empty when nothing is wrong", () => {
		expect(issueSummary({ mustFix: 0, notMet: 0, forInformation: 0 }, t)).toBe(
			""
		);
	});
});

describe("orderedIssues", () => {
	const issues = rosterIssues(
		input({ brokenMusts: [brokenMust], gaps: [staffingGapFixture()] })
	);

	it("orders by person, then day", () => {
		expect(orderedIssues(issues, "byPerson").map((issue) => issue.who)).toEqual(
			[
				"Aisha Rahman",
				"Ben Ortiz",
				"scheduling.issues.jobShort(Front Desk Staff)",
			]
		);
	});

	it("orders by day, then person", () => {
		expect(orderedIssues(issues, "byDay").map((issue) => issue.day)).toEqual([
			"2026-10-14",
			"2026-10-15",
			"2026-10-17",
		]);
	});

	it("keeps one group's items only", () => {
		expect(issuesOfGroup(issues, "notMet", "byDay")).toEqual([]);
	});
});
