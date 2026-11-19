import {
	changesUnchecked,
	type ValidationStanding,
} from "@/features/scheduling/rulesCheck/issuesFromValidation";
import {
	RETRYABLE_CHECK_REFUSALS,
	type RulesCheckRefusal,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

/*
 * The one line at the head of the Issues panel about the rules check, pure:
 * "Checked 15:42 · Check again" in place of the check's own section. Every
 * state offers the same action, which runs the check again, except a check
 * that is running or refused for good.
 */

/** Where the rules check stands, as the Issues panel's head says it. */
export type CheckLine =
	| { state: "checking" }
	| { state: "refused"; refusal: RulesCheckRefusal; canRetry: boolean }
	/** Hand changes nothing has checked since, or a check made before the roster changed. */
	| { state: "unchecked" }
	/** Checked at the revision on screen; `incomplete` when the engine ran out of time. */
	| { state: "checked"; checkedAt: number | undefined; incomplete: boolean }
	/** Never changed and never checked: the list is the generation's. */
	| { state: "asGenerated" };

/** The head's line for the rules check; nothing for someone who may not run it. */
export const checkLineOf = (
	standing: ValidationStanding,
	validation: RosterValidation | undefined
): CheckLine | undefined => {
	if (!validation) return undefined;
	if (validation.status === "loading") return { state: "checking" };
	if (validation.status === "refused")
		return {
			state: "refused",
			refusal: validation.refusal,
			canRetry: RETRYABLE_CHECK_REFUSALS.includes(validation.refusal),
		};
	const { last } = validation;
	if (standing === "outOfDate" || changesUnchecked(standing, last))
		return { state: "unchecked" };
	if (standing === "current" && last)
		return {
			state: "checked",
			checkedAt: last.checkedAt,
			incomplete: last.check.mayBeShort,
		};
	return { state: "asGenerated" };
};
