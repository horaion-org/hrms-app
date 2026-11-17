import type { TFunction } from "i18next";
import { isOneOf } from "@/common/isOneOf";
import { ApiProblemError } from "@/common/problem";
import {
	CONSTRAINT_TYPES,
	type ConstraintType,
} from "@/features/scheduling/constraints/api";
import { CONSTRAINT_TYPE_CATALOGUE } from "@/features/scheduling/constraints/constraintTypeCatalogue";
import { requirementTagTone } from "@/features/scheduling/constraints/requirementTagTones";
import type { PanelItem } from "@/features/scheduling/roster/rosterPanels";
import type {
	BrokenRule,
	RosterRulesCheck,
	RuleViolation,
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

/** Each name a rule goes by, and the constraint type a manager sets it as (its record's `engineRuleNames`). */
const RULE_TYPES: ReadonlyMap<string, ConstraintType> = new Map(
	CONSTRAINT_TYPES.flatMap((type) =>
		CONSTRAINT_TYPE_CATALOGUE[type].engineRuleNames.map(
			(rule) => [rule, type] as const
		)
	)
);

/** The engine's rules that are no setting of their own, each with the roster check's label. */
const LABELLED_RULES = [
	"most_days_a_week",
	"overtime_past_the_normal_day",
	"overtime_past_the_normal_week",
	"overtime_respects_daily_work_cap",
	"work_minutes_per_period",
	"impossible_shift_assignment_is_zero",
	"at_most_one_role_assignment_per_day",
	"overtime_requires_base_shift",
	"overtime_extension_is_contiguous",
	"shift_preference_fairness",
	"timeblock_demand_coverage",
	"employee_role_requirement_per_horizon",
	"non_working_day_requires_off_day_type",
	"overtime_credit_partition",
	"shift_change_penalty_indicator",
	"working_day_follows_shift_assignment",
] as const;

type LabelledRule = (typeof LABELLED_RULES)[number];

/** Every rule name the table words, for tests and callers that ask before wording. */
export const NAMED_RULES: ReadonlyArray<string> = [
	...RULE_TYPES.keys(),
	...LABELLED_RULES,
];

/**
 * Every rule the engine registers, one per module of its `rostering/constraints`
 * folder (the module name is the rule name). Copied here so a test can fail when
 * the app has no label for one: a new engine rule must be added to this list
 * together with its label (a constraint type's `engineRuleNames` in
 * `constraintTypeCatalogue.ts`, or `LABELLED_RULES`).
 */
export const ENGINE_RULE_NAMES: ReadonlyArray<string> = [
	"at_most_one_role_assignment_per_day",
	"avoid_off_on_weekdays",
	"consecutive_day_work_patterns",
	"days_not_worked_together",
	"days_of_day_types_per_period",
	"employee_role_requirement_per_horizon",
	"impossible_shift_assignment_is_zero",
	"max_days_without_day_types",
	"minimum_rest_between_shifts",
	"most_call_backs_per_person",
	"most_days_a_week",
	"most_minutes_a_day",
	"most_overtime_minutes_a_month",
	"no_extra_hours_when_generating",
	"non_working_day_requires_off_day_type",
	"off_requirement_per_horizon",
	"overtime_credit_partition",
	"overtime_extension_is_contiguous",
	"overtime_past_the_normal_day",
	"overtime_past_the_normal_week",
	"overtime_requires_base_shift",
	"overtime_respects_daily_work_cap",
	"shift_change_penalty_indicator",
	"shift_demand_requirement",
	"shift_demand_with_substitutes",
	"shift_preference_fairness",
	"shift_presence_requirement",
	"timeblock_demand_coverage",
	"work_minutes_per_period",
	"working_day_follows_shift_assignment",
];

/** Why the check couldn't be shown, as the section words it. */
export type RulesCheckRefusal =
	"expired" | "notConnected" | "rosterMoved" | "tooSlow" | "failed";

/** The refusals a second try may mend: the engine failed, or took too long this time. */
export const RETRYABLE_CHECK_REFUSALS: ReadonlyArray<RulesCheckRefusal> = [
	"tooSlow",
	"failed",
];

/** The API's refusal codes, by what the section says. */
const REFUSALS: Record<string, RulesCheckRefusal> = {
	ROSTER_CHECK_NO_ENGINE_JOB: "expired",
	ROSTER_CHECK_JOB_EXPIRED: "expired",
	ROSTER_CHECK_ENGINE_NOT_CONFIGURED: "notConnected",
	ROSTER_REVISION_CONFLICT: "rosterMoved",
	ROSTER_CHECK_ENGINE_TOO_SLOW: "tooSlow",
};

/** What a failed check means; anything not named reads as the engine failing, which a retry may mend. */
export const rulesCheckRefusalOf = (error: unknown): RulesCheckRefusal =>
	(error instanceof ApiProblemError && error.errorCode
		? REFUSALS[error.errorCode]
		: undefined) ?? "failed";

/** Whether the app has a plain label for the engine's rule name. */
const isLabelled = (rule: string): rule is LabelledRule =>
	isOneOf(LABELLED_RULES, rule);

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
		RULE_TYPES.get(rule) ??
		CONSTRAINT_TYPES.find((constraintType) => constraintType === rule);
	if (type) return t(`scheduling.constraints.types.${type}`);
	return isLabelled(rule) ? t(`${key}.rule.${rule}`) : undefined;
};

/**
 * One broken rule's line: the company's own constraint name, else what the
 * rule is called (`ruleNameLabel`), else "A rule the app has no name for yet".
 */
export const brokenRuleLabel = (
	// Only its names: a generation's finding names a rule the same way, with no violations of its own.
	rule: Omit<BrokenRule, "violations">,
	t: TFunction
): string => {
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

/** Who and which day one violation is about: "Lina Tan · Tue 10 Nov", "Lina Tan", "Tue 10 Nov", or nothing. */
const placeOf = (
	violation: RuleViolation,
	names: ReadonlyMap<string, string | null>,
	t: TFunction,
	formatDay: (date: string) => string
): string | undefined => {
	const person =
		violation.employeeId === null
			? undefined
			: (names.get(violation.employeeId) ??
				t("scheduling.detail.formerMember"));
	const day = violation.date === null ? undefined : formatDay(violation.date);
	if (person && day) return t(`${key}.notMet.place`, { person, day });
	return person ?? day;
};

/** How many people and days the rules asked "if possible" are not met for: one per placed violation. */
export const notMetCount = (check: RosterRulesCheck): number =>
	(check.notMet ?? []).reduce(
		(total, rule) => total + Math.max(rule.violations?.length ?? 0, 1),
		0
	);

/**
 * The rules asked "if possible" that the roster does not meet, as Issues
 * lists them apart from the musts: one item per rule, titled by its name and
 * tagged "If possible" in that tag's own tone, then one line per person and
 * day with the engine's own words. None when every one is met or the check
 * could not say.
 */
export const notMetItems = (
	check: RosterRulesCheck,
	t: TFunction,
	formatDay: (date: string) => string
): Array<PanelItem> => {
	const names = new Map(
		check.members.map((member) => [member.memberProfileId, member.displayName])
	);
	return (check.notMet ?? []).map((rule, index) => ({
		key: `${rule.rule}-${index}`,
		title: brokenRuleLabel(rule, t),
		tag: {
			label: t("scheduling.constraints.requirements.SHOULD"),
			tone: requirementTagTone("SHOULD"),
		},
		lines: (rule.violations ?? []).flatMap((violation) => {
			const place = placeOf(violation, names, t, formatDay);
			return violation.messages.map((message) =>
				place ? t(`${key}.notMet.line`, { place, message }) : message
			);
		}),
	}));
};
