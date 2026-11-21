import { useEffect } from "react";
import { checkDue } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import type { RosterValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

/**
 * Keeps the rules check current while `active` (the Issues panel open on a
 * roster that may be changed): whenever the roster's revision on screen moves
 * past the last check, whatever moved it (a change here, a refusal's refresh,
 * someone else's change), the check is asked at that revision by itself, once.
 */
export const useCheckKeptCurrent = (
	validation: RosterValidation | undefined,
	active: boolean
): void => {
	const due = active && validation !== undefined && checkDue(validation);
	useEffect(() => {
		if (due) validation?.askAt(validation.revision);
	}, [due, validation]);
};
