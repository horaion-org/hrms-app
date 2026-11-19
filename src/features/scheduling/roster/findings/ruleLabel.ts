import type { TFunction } from "i18next";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";
import { brokenRuleLabel } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";

/** The engine's own rule for the demand forecast; no constraint stands behind it. */
const FORECAST_DEMAND_RULE = "timeblock_demand_coverage";

/** "UNKNOWN_CODE" or "some_rule_name" → "Unknown code", "Some rule name". */
export const humaniseIdentifier = (identifier: string): string => {
	const words = identifier.replace(/[_-]+/g, " ").trim().toLowerCase();
	return words.charAt(0).toUpperCase() + words.slice(1);
};

/** A rule as the engine names it: its rule name, and the constraint copy behind it when there is one. */
export type EngineRule = { name: string; constraintId: string | null };

/**
 * What a rule is called on the roster: the schedule's constraint by its own
 * name, else the forecast, else the one rule table's words
 * (`brokenRuleLabel`), else "A rule the app has no name for yet": an engine name is never
 * shown.
 */
export const ruleLabel = (
	{ name, constraintId }: EngineRule,
	rules: FindingNames["rules"],
	t: TFunction
): string => {
	const constraintName =
		constraintId === null ? undefined : rules.get(constraintId);
	if (constraintName !== undefined) return constraintName;
	if (name === FORECAST_DEMAND_RULE)
		return t("scheduling.findings.forecastDemand");
	return brokenRuleLabel({ rule: name, constraintId, constraintName: null }, t);
};
