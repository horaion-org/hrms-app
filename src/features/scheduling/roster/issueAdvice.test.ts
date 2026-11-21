import { describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { CONSTRAINT_TYPES } from "@/features/scheduling/constraints/api";
import { CONSTRAINT_TYPE_CATALOGUE } from "@/features/scheduling/constraints/constraintTypeCatalogue";
import {
	ADVICE_BY_CONSTRAINT_TYPE,
	ADVICE_BY_ENGINE_RULE,
	ISSUE_ADVICE_KEYS,
	issueAdviceOf,
	ruleAdviceOf,
	type RuleAdvice,
} from "@/features/scheduling/roster/issueAdvice";
import { rosterIssueFixture } from "@/features/scheduling/roster/rosterIssueFixtures";
import type { RosterIssue } from "@/features/scheduling/roster/rosterIssueGroups";
import {
	ENGINE_RULE_NAMES,
	NAMED_RULES,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";

/** A must broken under the rule the engine names `rule`, with the engine's `sentence`. */
const ruleIssue = (
	rule: string,
	sentence = "Aisha Rahman: something is wrong."
): RosterIssue =>
	rosterIssueFixture({
		rule: `${sentence} Rule: A rule`,
		subject: { kind: "rule", rule },
	});

/** One row per rule type the app knows: the name the engine reports it by, and its advice or none. */
const RULE_TYPE_ROWS: ReadonlyArray<[string, string, string | undefined]> = [
	// The constraint types of the Constraints dialog and the company's work policy.
	["SHIFT_STAFFING", "shift_demand_requirement", "staffByHand"],
	[
		"SHIFT_STAFFING_WITH_STAND_INS",
		"shift_demand_with_substitutes",
		"staffByHand",
	],
	["ROLE_PRESENCE", "shift_presence_requirement", "staffByHand"],
	["DAYS_OFF_PER_PERIOD", "off_requirement_per_horizon", "daysOff"],
	["AVOID_DAYS_OFF_ON", "avoid_off_on_weekdays", "avoidDayOff"],
	["REST_BETWEEN_SHIFTS", "minimum_rest_between_shifts", "restBetweenShifts"],
	["BANNED_SHIFT_PATTERN", "consecutive_day_work_patterns", "pattern"],
	["MAX_DAYS_WITHOUT_DAY_TYPES", "max_days_without_day_types", "daysInARow"],
	["DAY_TYPE_DAYS_PER_WEEK", "days_of_day_types_per_period", "requiredDays"],
	["MAX_WORK_HOURS_PER_DAY", "most_minutes_a_day", "lessThatDay"],
	["MAX_WORK_HOURS_PER_DAY", "max_work_hours_per_day", "lessThatDay"],
	[
		"MAX_OVERTIME_HOURS_PER_MONTH",
		"most_overtime_minutes_a_month",
		"lessThatMonth",
	],
	[
		"MAX_OVERTIME_HOURS_PER_MONTH",
		"max_overtime_hours_per_month",
		"lessThatMonth",
	],
	["SHORTEST_PART_SHIFT", "shortest_part_shift", undefined],
	["MAX_CALL_BACKS_PER_PERSON", "most_call_backs_per_person", "callBacks"],
	["PAY_RATES", "PAY_RATES", undefined],
	[
		"NO_OVERTIME_WHEN_GENERATING",
		"no_extra_hours_when_generating",
		"noExtraHours",
	],
	["OVERTIME_STRETCH", "OVERTIME_STRETCH", undefined],
	["KEEP_DAYS_OFF_TOGETHER", "days_not_worked_together", "keepDaysOffTogether"],
	// The engine's rules that are no constraint type.
	["engine", "most_days_a_week", "lessThatWeek"],
	["engine", "overtime_past_the_normal_day", "lessThatDay"],
	["engine", "overtime_past_the_normal_week", "lessThatWeek"],
	["engine", "overtime_respects_daily_work_cap", "lessThatDay"],
	["engine", "work_minutes_per_period", undefined],
	["engine", "impossible_shift_assignment_is_zero", "cantWorkShift"],
	["engine", "at_most_one_role_assignment_per_day", "oneShiftADay"],
	["engine", "overtime_requires_base_shift", "overtimeNeedsShift"],
	["engine", "overtime_extension_is_contiguous", "overtimeJoined"],
	["engine", "shift_preference_fairness", "preferences"],
	["engine", "timeblock_demand_coverage", "staffByHand"],
	["engine", "employee_role_requirement_per_horizon", "daysInRole"],
	["engine", "non_working_day_requires_off_day_type", "dayType"],
	["engine", "overtime_credit_partition", undefined],
	["engine", "shift_change_penalty_indicator", "startTimeChange"],
	["engine", "working_day_follows_shift_assignment", undefined],
];

describe("issueAdviceOf: one row per rule type", () => {
	it.each(RULE_TYPE_ROWS)("%s reported as %s advises %s", (_, rule, key) => {
		expect(issueAdviceOf(ruleIssue(rule))?.key).toBe(key);
	});

	it("names every rule type in the table above", () => {
		const tabled = new Set(RULE_TYPE_ROWS.map(([, rule]) => rule));
		const known = [
			...CONSTRAINT_TYPES.flatMap((type) => {
				const names = CONSTRAINT_TYPE_CATALOGUE[type].engineRuleNames;
				return names.length > 0 ? names : [type];
			}),
			...ADVICE_BY_ENGINE_RULE.keys(),
		];
		expect(known.filter((rule) => !tabled.has(rule))).toEqual([]);
	});
});

/** Whether a rule type's entry is a line of advice or a reason for none. */
const isDecided = (advice: RuleAdvice | undefined): boolean =>
	advice !== undefined &&
	(typeof advice === "string"
		? ISSUE_ADVICE_KEYS.includes(advice)
		: advice.none.length > 0);

describe("issue advice: no rule type is left out", () => {
	it("decides every constraint type of the app's catalogue, by its code and by each engine name", () => {
		const undecided = CONSTRAINT_TYPES.flatMap((type) => [
			type,
			...CONSTRAINT_TYPE_CATALOGUE[type].engineRuleNames,
		]).filter((name) => !isDecided(ruleAdviceOf(name)));
		expect(undecided).toEqual([]);
		expect(Object.keys(ADVICE_BY_CONSTRAINT_TYPE).sort()).toEqual(
			[...CONSTRAINT_TYPES].sort()
		);
	});

	it("decides every rule the app has a name for and every rule the engine registers", () => {
		const undecided = [...NAMED_RULES, ...ENGINE_RULE_NAMES].filter(
			(rule) => !isDecided(ruleAdviceOf(rule))
		);
		expect(undecided).toEqual([]);
	});

	it("uses every line of advice somewhere", () => {
		const fromRules = [
			...Object.values(ADVICE_BY_CONSTRAINT_TYPE),
			...ADVICE_BY_ENGINE_RULE.values(),
		].filter((advice) => typeof advice === "string");
		// Chosen by the row or its sentence, not by a rule type alone.
		const fromTheItem = ["restBetweenShiftsHours", "validate"];
		expect([...new Set([...fromRules, ...fromTheItem])].sort()).toEqual(
			[...ISSUE_ADVICE_KEYS].sort()
		);
	});
});

describe("issueAdviceOf: by the item itself", () => {
	it("advises nothing for a short shift's row, which is covered from the row itself", () => {
		const gap = rosterIssueFixture({
			action: { kind: "findCover", gap: { shiftId: "s-1", day: "2026-10-17" } },
			subject: { kind: "rule", rule: "shift_demand_requirement" },
		});
		const leaveShort = rosterIssueFixture({
			action: { kind: "findCover", gap: { shiftId: "s-1", day: "2026-10-17" } },
		});

		expect(issueAdviceOf(gap)).toBeUndefined();
		expect(issueAdviceOf(leaveShort)).toBeUndefined();
	});

	it.each([
		{
			case: "whole hours stated",
			sentence:
				"Soren Mbeki: less than 12 hours of rest after the shift on 2026-12-10: 8 hours given.",
			advice: {
				key: "restBetweenShiftsHours",
				values: { hours: 12 },
				neighbouringDays: false,
			},
		},
		{
			case: "hours and minutes stated: no number is made up",
			sentence:
				"Soren Mbeki: less than 11 hours 30 minutes of rest after the shift on 2026-12-10.",
			advice: { key: "restBetweenShifts", neighbouringDays: false },
		},
		{
			case: "no sentence from the engine",
			sentence: "A rule that must hold is broken here.",
			advice: { key: "restBetweenShifts", neighbouringDays: false },
		},
		{
			case: "the next shift is in the schedule after this one",
			sentence:
				"Soren Mbeki: less than 12 hours of rest after the shift on 2026-12-13, before the next shift, which is in the schedule after this one.",
			advice: {
				key: "restBetweenShiftsHours",
				values: { hours: 12 },
				neighbouringDays: true,
			},
		},
		{
			case: "the last shift is before the schedule",
			sentence:
				"Soren Mbeki: less than 12 hours of rest after the last shift before the schedule: 8 hours given.",
			advice: {
				key: "restBetweenShiftsHours",
				values: { hours: 12 },
				neighbouringDays: true,
			},
		},
	])("rest between shifts: $case", ({ sentence, advice }) => {
		expect(
			issueAdviceOf(ruleIssue("minimum_rest_between_shifts", sentence))
		).toEqual(advice);
	});

	it("adds the neighbouring days for a run that goes on into the next schedule", () => {
		const issue = ruleIssue(
			"max_days_without_day_types",
			"Quinn Adebayo: 6 days in a row without Off or Rest day up to 2026-12-13, at most 5. The run goes on into the schedule after this one."
		);

		expect(issueAdviceOf(issue)).toEqual({
			key: "daysInARow",
			neighbouringDays: true,
		});
	});

	it("advises a rule asked if possible as it does a must", () => {
		const issue = rosterIssueFixture({
			group: "notMet",
			subject: { kind: "rule", rule: "avoid_off_on_weekdays" },
		});

		expect(issueAdviceOf(issue)?.key).toBe("avoidDayOff");
	});

	it("sends a generation's error, which names no rule, to Validate schedule", () => {
		const issue = rosterIssueFixture({ subject: { kind: "generationError" } });

		expect(issueAdviceOf(issue)).toEqual({
			key: "validate",
			neighbouringDays: false,
		});
	});

	it.each([
		{
			case: "a note for information",
			issue: rosterIssueFixture({
				group: "forInformation",
				subject: { kind: "rule", rule: "minimum_rest_between_shifts" },
			}),
		},
		{
			case: "an item of the roster's own lists, whose sentence says what to do",
			issue: rosterIssueFixture({
				rule: "This day needs attention. Give Aisha Rahman a shift or confirm the day off.",
			}),
		},
		{
			case: "a rule the engine did not name",
			issue: ruleIssue("unnamed"),
		},
		{
			case: "a rule the app does not know yet",
			issue: ruleIssue("a_rule_added_tomorrow"),
		},
		{
			case: "a rule whose engine sentence ends with what to do",
			issue: ruleIssue(
				"work_minutes_per_period",
				"Aisha Rahman: 50 hours in the week, at most 44. Take shifts off them in that period."
			),
		},
		{
			case: "a name every object has, which is no rule",
			issue: ruleIssue("constructor"),
		},
	])("gives none for $case", ({ issue }) => {
		expect(issueAdviceOf(issue)).toBeUndefined();
	});
});

describe("issue advice: the wording", () => {
	it("has a sentence for every line of advice, and nothing but the two lines around them", () => {
		expect(Object.keys(en.scheduling.issues.advice).sort()).toEqual(
			[...ISSUE_ADVICE_KEYS, "lead", "withNeighbouringDays"].sort()
		);
	});
});
