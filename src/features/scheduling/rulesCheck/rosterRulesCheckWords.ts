import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import {
	CONSTRAINT_TYPES,
	type ConstraintType,
} from "@/features/scheduling/constraints/api";
import type { PanelItem } from "@/features/scheduling/roster/rosterPanels";
import type {
	BrokenRule,
	RosterRulesCheck,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";

/*
 * The roster check in the app's words, pure: the API sends a status and the
 * engine's rule names, and the app writes every line (ADR-0003).
 */

const key = "scheduling.rulesCheck";

/*
 * The one table of what each engine rule is called, wherever a rule is named
 * (Issues, Validate schedule, Find cover, why nobody was assigned). A rule a
 * manager sets as a constraint reads as that constraint type does in the
 * settings and the constraint lists ("Most hours a day"), under every name
 * the engine or the API's settings give it; the engine's own rules that are
 * no setting read by the roster check's label.
 */

/** Each name a rule goes by, and the constraint type a manager sets it as. */
const RULE_TYPES: Readonly<Record<string, ConstraintType>> = {
	shift_demand_requirement: "SHIFT_STAFFING",
	shift_demand_with_substitutes: "SHIFT_STAFFING_WITH_STAND_INS",
	shift_presence_requirement: "ROLE_PRESENCE",
	off_requirement_per_horizon: "DAYS_OFF_PER_PERIOD",
	avoid_off_on_weekdays: "AVOID_DAYS_OFF_ON",
	minimum_rest_between_shifts: "REST_BETWEEN_SHIFTS",
	max_days_without_day_types: "MAX_DAYS_WITHOUT_DAY_TYPES",
	days_of_day_types_per_period: "DAY_TYPE_DAYS_PER_WEEK",
	max_work_hours_per_day: "MAX_WORK_HOURS_PER_DAY",
	most_minutes_a_day: "MAX_WORK_HOURS_PER_DAY",
	max_overtime_hours_per_month: "MAX_OVERTIME_HOURS_PER_MONTH",
	most_overtime_minutes_a_month: "MAX_OVERTIME_HOURS_PER_MONTH",
	shortest_part_shift: "SHORTEST_PART_SHIFT",
	most_call_backs_per_person: "MAX_CALL_BACKS_PER_PERSON",
};

/** The engine's rules that are no setting of their own, each with the roster check's label. */
const LABELLED_RULES = [
	"most_days_a_week",
	"overtime_past_the_normal_day",
	"overtime_past_the_normal_week",
	"overtime_respects_daily_work_cap",
	"work_minutes_per_period",
	"consecutive_day_work_patterns",
] as const;

type LabelledRule = (typeof LABELLED_RULES)[number];

/** Every rule name the table words, for tests and callers that ask before wording. */
export const NAMED_RULES: ReadonlyArray<string> = [
	...Object.keys(RULE_TYPES),
	...LABELLED_RULES,
];

/** Why the check couldn't be shown, as the section words it. */
export type RulesCheckRefusal =
	"expired" | "notConnected" | "rosterMoved" | "failed";

/** The API's refusal codes, by what the section says. */
const REFUSALS: Record<string, RulesCheckRefusal> = {
	ROSTER_CHECK_NO_ENGINE_JOB: "expired",
	ROSTER_CHECK_JOB_EXPIRED: "expired",
	ROSTER_CHECK_ENGINE_NOT_CONFIGURED: "notConnected",
	ROSTER_REVISION_CONFLICT: "rosterMoved",
};

/** What a failed check means; anything not named reads as the engine failing, which a retry may mend. */
export const rulesCheckRefusalOf = (error: unknown): RulesCheckRefusal =>
	(error instanceof ApiProblemError && error.errorCode
		? REFUSALS[error.errorCode]
		: undefined) ?? "failed";

/** Whether the app has a plain label for the engine's rule name. */
const isLabelled = (rule: string): rule is LabelledRule =>
	(LABELLED_RULES as ReadonlyArray<string>).includes(rule);

/**
 * What a rule is called, by any name the engine or the settings give it: its
 * constraint type's label, else the roster check's label; undefined for a
 * name the table does not know.
 */
export const ruleNameLabel = (
	rule: string,
	t: TFunction
): string | undefined => {
	const type =
		RULE_TYPES[rule] ??
		CONSTRAINT_TYPES.find((constraintType) => constraintType === rule);
	if (type) return t(`scheduling.constraints.types.${type}`);
	return isLabelled(rule) ? t(`${key}.rule.${rule}`) : undefined;
};

/**
 * One broken rule's line: the company's own constraint name, else what the
 * rule is called (`ruleNameLabel`), else a generic "A working-time rule".
 */
export const brokenRuleLabel = (rule: BrokenRule, t: TFunction): string => {
	if (rule.constraintName) return rule.constraintName;
	return ruleNameLabel(rule.rule, t) ?? t(`${key}.unnamedRule`);
};

/**
 * How many problems the check's broken rules count as: one per rule named,
 * and one when the roster is broken with none named; none unless broken.
 */
export const brokenRuleCount = (check: RosterRulesCheck): number =>
	check.status === "BROKEN" ? Math.max(check.brokenRules.length, 1) : 0;

/**
 * What the week bar's button marks once the current revision is validated:
 * how many problems (rules broken, at least one when broken with none named,
 * plus staffing gaps), or none for a roster that holds and is fully staffed;
 * nothing when the engine could not check either part.
 */
export const validationMark = (
	check: RosterRulesCheck
): { kind: "problems"; count: number } | { kind: "clean" } | undefined => {
	const problems = brokenRuleCount(check) + (check.staffingGaps?.length ?? 0);
	if (problems > 0) return { kind: "problems", count: problems };
	return check.status === "HOLDS" && check.staffingGaps !== null
		? { kind: "clean" }
		: undefined;
};

/**
 * The broken rules as Issues lists them, one item each: the company's
 * constraint name, else the app's label, else a generic line; one "breaks a
 * working-time rule" item when the engine named none.
 */
export const brokenRuleItems = (
	check: RosterRulesCheck,
	t: TFunction
): Array<PanelItem> => {
	if (check.status !== "BROKEN") return [];
	if (check.brokenRules.length === 0)
		return [{ key: "unnamed", lines: [t(`${key}.brokenUnnamed`)] }];
	return check.brokenRules.map((rule, index) => ({
		key: `${rule.rule}-${index}`,
		lines: [brokenRuleLabel(rule, t)],
	}));
};
