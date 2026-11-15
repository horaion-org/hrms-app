import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
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

/** The engine's working-time rules the app has a plain label for. */
export const LABELLED_RULES = [
	"most_minutes_a_day",
	"most_overtime_minutes_a_month",
	"most_days_a_week",
	"minimum_rest_between_shifts",
	"most_call_backs_per_person",
	"overtime_past_the_normal_day",
	"overtime_past_the_normal_week",
	"overtime_respects_daily_work_cap",
	"work_minutes_per_period",
	"consecutive_day_work_patterns",
	"max_days_without_day_types",
	"off_requirement_per_horizon",
	"days_of_day_types_per_period",
] as const;

type LabelledRule = (typeof LABELLED_RULES)[number];

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

const isLabelled = (rule: string): rule is LabelledRule =>
	(LABELLED_RULES as ReadonlyArray<string>).includes(rule);

/**
 * One broken rule's line: the company's own constraint name, else the app's
 * label for the engine's rule, else a generic "A working-time rule".
 */
export const brokenRuleLabel = (rule: BrokenRule, t: TFunction): string => {
	if (rule.constraintName) return rule.constraintName;
	return isLabelled(rule.rule)
		? t(`${key}.rule.${rule.rule}`)
		: t(`${key}.unnamedRule`);
};

/**
 * What the week bar's button marks once the current revision is validated:
 * how many problems (rules broken, at least one when broken with none named,
 * plus staffing gaps), or none for a roster that holds and is fully staffed;
 * nothing when the engine could not check either part.
 */
export const validationMark = (
	check: RosterRulesCheck
): { kind: "problems"; count: number } | { kind: "clean" } | undefined => {
	const broken =
		check.status === "BROKEN" ? Math.max(check.brokenRules.length, 1) : 0;
	const problems = broken + (check.staffingGaps?.length ?? 0);
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
