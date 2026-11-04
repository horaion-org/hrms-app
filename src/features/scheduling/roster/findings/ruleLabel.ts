import type { TFunction } from "i18next";
import type { ConstraintType } from "@/features/scheduling/constraints/api";
import type { FindingNames } from "@/features/scheduling/roster/findings/findingNames";

/*
 * The engine names a rule by its own rule name (`shift_demand_requirement`),
 * never by the constraint's. These are the engine names the API gives each
 * constraint type (`ConstraintType.java` in the API), so a rule the schedule's
 * constraints can't name still reads as its type.
 */
const ENGINE_RULE_TYPES: ReadonlyMap<string, ConstraintType> = new Map([
	["shift_demand_requirement", "SHIFT_STAFFING"],
	["shift_demand_with_substitutes", "SHIFT_STAFFING_WITH_STAND_INS"],
	["shift_presence_requirement", "ROLE_PRESENCE"],
	["off_requirement_per_horizon", "DAYS_OFF_PER_PERIOD"],
	["avoid_off_on_weekdays", "AVOID_DAYS_OFF_ON"],
	["minimum_rest_between_shifts", "REST_BETWEEN_SHIFTS"],
]);
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
 * name, else its type, else the forecast, else its engine name made readable.
 */
export const ruleLabel = (
	{ name, constraintId }: EngineRule,
	rules: FindingNames["rules"],
	t: TFunction
): string => {
	const constraintName =
		constraintId === null ? undefined : rules.get(constraintId);
	if (constraintName !== undefined) return constraintName;
	const type = ENGINE_RULE_TYPES.get(name);
	if (type !== undefined) return t(`scheduling.constraints.types.${type}`);
	if (name === FORECAST_DEMAND_RULE)
		return t("scheduling.findings.forecastDemand");
	return humaniseIdentifier(name);
};
