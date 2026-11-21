import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import {
	ruleFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	dayListText,
	issueCounts,
	rosterIssues,
	shortShiftCount,
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
	it("lists one shift short in two runs that day as one item with both runs, the most short counted", () => {
		const issues = rosterIssues(
			input({
				gaps: [
					staffingGapFixture({
						start: "2026-10-17T09:00",
						end: "2026-10-17T11:00",
					}),
					staffingGapFixture({
						conflictId: "c-2",
						start: "2026-10-17T13:00",
						end: "2026-10-17T15:00",
						missing: 2,
					}),
				],
			})
		);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({
			who: "scheduling.issues.jobShort(2|Front Desk Staff)",
			time: "scheduling.constraints.list(09:00–11:00,13:00–15:00)",
		});
	});

	it("lists a shift short as its job title short, its day and time, with Find cover", () => {
		const [issue] = rosterIssues(input({ gaps: [staffingGapFixture()] }));

		expect(issue).toMatchObject({
			group: "mustFix",
			who: "scheduling.issues.jobShort(1|Front Desk Staff)",
			day: "2026-10-17",
			time: "scheduling.constraints.list(09:00–15:00)",
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

	it("carries the engine's rule behind each gap and each rule's item, which its advice is chosen by, and the frozen constraint of a rule naming who", () => {
		const gap = staffingGapFixture();
		const placeless = ruleFixture({ rule: "most_days_a_week" });
		const issues = rosterIssues(
			input({ gaps: [gap], brokenMusts: [brokenMust], notMet: [placeless] })
		);

		expect(issues.map((issue) => issue.subject)).toEqual([
			{ kind: "rule", rule: gap.sourceRule },
			{
				kind: "rule",
				rule: brokenMust.rule,
				constraintId: brokenMust.constraintId,
			},
			{
				kind: "rule",
				rule: brokenMust.rule,
				constraintId: brokenMust.constraintId,
			},
			{ kind: "rule", rule: "most_days_a_week" },
		]);
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
			input({
				notMet: [
					ruleFixture({
						constraintName: "Weekends off",
						violations: [
							{ employeeId: "mp-2", date: "2026-10-17", messages: [] },
						],
					}),
				],
			})
		);

		expect(issue?.rule).toBe("scheduling.issues.notMetRule(Weekends off)");
	});

	it("lists a rule naming no one once, by the rule's name", () => {
		const issues = rosterIssues(
			input({ notMet: [ruleFixture({ constraintName: "Weekends off" })] })
		);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({
			group: "notMet",
			who: "Weekends off",
			day: null,
			rule: "scheduling.issues.notMetSomewhere",
		});
	});

	it("words a rule the engine named with no violations, saying in one line it could not say where", () => {
		const [issue] = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({ rule: "impossible_shift_assignment_is_zero" }),
				],
			})
		);

		expect(issue).toMatchObject({
			who: "scheduling.rulesCheck.rule.impossible_shift_assignment_is_zero",
			rule: "scheduling.issues.brokenSomewhere",
		});
	});

	it("names the person and day of the same rule when the engine sends violations", () => {
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
	});

	it("leads with the rule's name only for an item with no person and no day, with the engine's sentence when sent", () => {
		const issues = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({
						constraintName: "Most hours a day",
						violations: [
							{
								employeeId: null,
								date: null,
								messages: ["Too few rest days."],
							},
							{ employeeId: "mp-1", date: null, messages: [] },
							{ employeeId: null, date: "2026-10-14", messages: [] },
						],
					}),
				],
			})
		);

		expect(issues.map((issue) => [issue.who, issue.rule])).toEqual([
			["Most hours a day", "Too few rest days."],
			["Aisha Rahman", "scheduling.issues.brokenMust(Most hours a day)"],
			[
				"scheduling.issues.wholeRoster",
				"scheduling.issues.brokenMust(Most hours a day)",
			],
		]);
	});

	it("lists notes for information, and nothing twice", () => {
		const issues = rosterIssues(
			input({
				brokenMusts: [brokenMust, brokenMust],
				gaps: [staffingGapFixture(), staffingGapFixture()],
				notes: [
					{
						title: "Roster note",
						detail: "Public holiday on Monday",
						topic: "Day notes",
					},
					{
						title: "Roster note",
						detail: "Public holiday on Monday",
						topic: "Day notes",
					},
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

describe("one broken rule for one person", () => {
	const WEEK = [
		"2026-02-01",
		"2026-02-02",
		"2026-02-03",
		"2026-02-04",
		"2026-02-05",
		"2026-02-06",
		"2026-02-07",
	];
	const SENTENCE = "Aisha Rahman: 7 days worked in the week, at most 6.";
	const mostDays = (
		violations: Array<{
			employeeId: string;
			date: string;
			messages: Array<string>;
		}>
	): ReturnType<typeof ruleFixture> =>
		ruleFixture({ constraintName: "Most days a week", violations });

	it("is one row naming the seven days when the engine says the same each day, counted once", () => {
		const issues = rosterIssues(
			input({
				brokenMusts: [
					mostDays(
						[...WEEK].reverse().map((date) => ({
							employeeId: "mp-1",
							date,
							messages: [SENTENCE],
						}))
					),
				],
			})
		);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({
			who: "Aisha Rahman",
			day: "2026-02-01",
			days: WEEK,
			rule: `scheduling.issues.ruleSentence(${SENTENCE}|Most days a week)`,
		});
		expect(issueCounts(issues).mustFix).toBe(1);
	});

	it("names every day Validate sends for the person, on one row counted once", () => {
		const issues = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({
						constraintName: "Most days a week",
						violations: [
							{
								employeeId: "mp-1",
								date: WEEK[0]!,
								days: WEEK,
								messages: [SENTENCE],
							},
						],
					}),
				],
			})
		);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({ day: WEEK[0], days: WEEK });
		expect(issueCounts(issues).mustFix).toBe(1);
	});

	it("names only the date of a violation sent without its days", () => {
		const [issue] = rosterIssues(
			input({
				brokenMusts: [
					ruleFixture({
						violations: [
							{ employeeId: "mp-1", date: WEEK[2]!, messages: [SENTENCE] },
						],
					}),
				],
			})
		);

		expect(issue?.days).toEqual([WEEK[2]]);
	});

	it("keeps two rows for two different sentences, and for two people", () => {
		const issues = rosterIssues(
			input({
				brokenMusts: [
					mostDays([
						{ employeeId: "mp-1", date: WEEK[0]!, messages: [SENTENCE] },
						{ employeeId: "mp-1", date: WEEK[1]!, messages: ["Another."] },
						{ employeeId: "mp-2", date: WEEK[0]!, messages: [SENTENCE] },
					]),
				],
			})
		);

		expect(issues.map((issue) => [issue.who, issue.days])).toEqual([
			["Aisha Rahman", [WEEK[0]]],
			["Aisha Rahman", [WEEK[1]]],
			["Ben Ortiz", [WEEK[0]]],
		]);
	});

	it("joins the same in Could not be met, and leaves shifts short one per shift and day", () => {
		const issues = rosterIssues(
			input({
				gaps: [
					staffingGapFixture(),
					staffingGapFixture({ conflictId: "c-2", date: "2026-10-18" }),
				],
				notMet: [
					mostDays(
						WEEK.slice(0, 2).map((date) => ({
							employeeId: "mp-2",
							date,
							messages: ["Works both days."],
						}))
					),
				],
			})
		);

		expect(issueCounts(issues)).toEqual({
			mustFix: 2,
			notMet: 1,
			forInformation: 0,
		});
	});
});

describe("dayListText", () => {
	const formatOne = (day: string): string => `day ${day}`;

	it("writes consecutive days as a run", () => {
		expect(
			dayListText(["2026-02-01", "2026-02-02", "2026-02-03"], formatOne, t)
		).toBe("scheduling.issues.dayRun(day 2026-02-01|day 2026-02-03)");
	});

	it("lists days that are not consecutive", () => {
		expect(dayListText(["2026-02-01", "2026-02-03"], formatOne, t)).toBe(
			"scheduling.constraints.list(day 2026-02-01,day 2026-02-03)"
		);
	});

	it("writes one day as itself, and nothing for none", () => {
		expect(dayListText(["2026-02-01"], formatOne, t)).toBe("day 2026-02-01");
		expect(dayListText([], formatOne, t)).toBe("");
	});
});

describe("shortShiftCount", () => {
	const sundayGap = staffingGapFixture({
		conflictId: "validated-2",
		date: "2026-10-18",
		start: "2026-10-18T09:00",
		end: "2026-10-18T15:00",
	});

	it("given_twoShiftsShortAndABrokenRule_when_counted_then_onlyTheShiftsCount", () => {
		const issues = rosterIssues(
			input({
				gaps: [staffingGapFixture(), sundayGap],
				brokenMusts: [brokenMust],
			})
		);

		expect(shortShiftCount(issues)).toBe(2);
	});

	it("given_noGaps_when_counted_then_zero", () => {
		expect(
			shortShiftCount(rosterIssues(input({ brokenMusts: [brokenMust] })))
		).toBe(0);
	});

	it("given_aGapWithNoShiftToCover_when_counted_then_itStillCounts", () => {
		expect(
			shortShiftCount(
				rosterIssues(input({ gaps: [staffingGapFixture({ shiftUuids: [] })] }))
			)
		).toBe(1);
	});
});
