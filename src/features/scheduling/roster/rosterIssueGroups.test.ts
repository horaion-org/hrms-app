import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	ruleFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	issueCounts,
	issueSummaryParts,
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
			who: "scheduling.issues.jobShort(1|Front Desk Staff)",
			day: "2026-10-17",
			time: "09:00–15:00",
			action: {
				kind: "findCover",
				gap: { day: "2026-10-17" },
			},
		});
		// Line 1 and Find cover already say it is short: line 2 is only the rule.
		expect(issue?.rule).toMatch(/^scheduling\.issues\.ruleOnly\(/);
	});

	it("offers Show for a gap with no shift to find cover for", () => {
		const [issue] = rosterIssues(
			input({ gaps: [staffingGapFixture({ shiftUuids: [] })] })
		);

		expect(issue?.action).toEqual({ kind: "show" });
	});

	it("lists each person and day a broken must names, to fix, saying a must is broken and naming the rule last", () => {
		const issues = rosterIssues(input({ brokenMusts: [brokenMust] }));

		expect(
			issues.map((issue) => [issue.group, issue.who, issue.day, issue.rule])
		).toEqual([
			[
				"mustFix",
				"Ben Ortiz",
				"2026-10-14",
				"scheduling.issues.brokenMust(Rest between shifts)",
			],
			[
				"mustFix",
				"Aisha Rahman",
				"2026-10-15",
				"scheduling.issues.brokenMust(Rest between shifts)",
			],
		]);
	});

	it("says what the engine found for a person and day, then the rule, not the generic reason", () => {
		const [mustFix, notMet] = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({
						constraintName: "Most days a week",
						violations: [
							{
								employeeId: "mp-1",
								date: "2026-10-18",
								messages: ["7 days worked in the week, at most 6."],
							},
						],
					}),
				],
				notMet: [
					ruleFixture({
						constraintName: "Weekends off",
						violations: [
							{
								employeeId: "mp-2",
								date: "2026-10-17",
								messages: ["Works Saturday."],
							},
						],
					}),
				],
			})
		);

		expect(mustFix?.rule).toBe(
			"scheduling.issues.ruleSentence(7 days worked in the week, at most 6.|Most days a week)"
		);
		expect(notMet?.rule).toBe(
			"scheduling.issues.ruleSentence(Works Saturday.|Weekends off)"
		);
	});

	it("says a rule asked if possible was not met, naming the rule last", () => {
		const [issue] = rosterIssues(
			input({ notMet: [ruleFixture({ constraintName: "Weekends off" })] })
		);

		expect(issue?.rule).toBe("scheduling.issues.notMetRule(Weekends off)");
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
			rule: "scheduling.issues.brokenMust(scheduling.rulesCheck.rule.impossible_shift_assignment_is_zero)",
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
			rule: "scheduling.issues.brokenMust(scheduling.rulesCheck.rule.impossible_shift_assignment_is_zero)",
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
				notes: [
					{ title: "Roster note", detail: "Public holiday on Monday" },
					{ title: "Roster note", detail: "Public holiday on Monday" },
				],
			})
		);

		expect(issueCounts(issues)).toEqual({
			mustFix: 3,
			notMet: 0,
			forInformation: 1,
		});
	});
});

describe("issueSummaryParts", () => {
	it("counts every group in order when each has items", () => {
		expect(
			issueSummaryParts({ mustFix: 6, notMet: 1, forInformation: 3 }, t)
		).toEqual([
			{ group: "mustFix", text: "scheduling.issues.summary.mustFix(6)" },
			{ group: "notMet", text: "scheduling.issues.summary.notMet(1)" },
			{
				group: "forInformation",
				text: "scheduling.issues.summary.forInformation(3)",
			},
		]);
	});

	it("leaves out a group with nothing in it", () => {
		expect(
			issueSummaryParts({ mustFix: 3, notMet: 0, forInformation: 1 }, t).map(
				(part) => part.group
			)
		).toEqual(["mustFix", "forInformation"]);
	});

	it("has no part when nothing is wrong", () => {
		expect(
			issueSummaryParts({ mustFix: 0, notMet: 0, forInformation: 0 }, t)
		).toEqual([]);
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
				"scheduling.issues.jobShort(1|Front Desk Staff)",
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
