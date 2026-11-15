import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type { LastValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import type { GenerationFindings } from "@/features/scheduling/schedules/api";

/*
 * One Issues list that says what is true now, pure: once the schedule is
 * validated, its staffing gaps stand in for the generation's conflicts (a
 * hand edit never changes what the generation stored) and its broken rules
 * join the list; the generation's other findings stay as they are.
 */

/** Where the list stands against the roster on screen. */
export type ValidationStanding =
	/** Validated at the revision on screen. */
	| "current"
	/** Validated at an earlier revision, or hand changes never validated in this visit. */
	| "outOfDate"
	/** Never changed and never validated: the generation's list is still what is true. */
	| "asGenerated";

/** How the list on screen compares with the roster on screen. */
export const validationStanding = ({
	revision,
	last,
	hasChanges,
}: {
	revision: number;
	last: LastValidation | undefined;
	hasChanges: boolean;
}): ValidationStanding => {
	if (last) return last.revision === revision ? "current" : "outOfDate";
	return hasChanges ? "outOfDate" : "asGenerated";
};

/** Findings with nothing in them, for a run that stored none, so validated gaps still have a list to join. */
const NO_FINDINGS: GenerationFindings = {
	scheduleStatus: "",
	failureReason: null,
	generatedAt: "",
	errors: [],
	diagnostics: [],
	conflicts: [],
	assignmentMessages: [],
	members: [],
};

/**
 * The findings Issues shows: the generation's, with its conflicts replaced by
 * the last validation's gaps when it worked them out; the generation's own
 * when nothing was validated or the gaps could not be worked out.
 */
export const findingsShown = (
	findings: GenerationFindings | null,
	last: LastValidation | undefined
): GenerationFindings | null => {
	const gaps = last?.check.staffingGaps;
	if (!last || gaps === null || gaps === undefined) return findings;
	return { ...(findings ?? NO_FINDINGS), conflicts: gaps };
};

/** How many issues the last validation's broken rules add: one per rule named, one when broken with none named. */
export const brokenRuleIssueCount = (
	last: LastValidation | undefined
): number =>
	last?.check.status === "BROKEN"
		? Math.max(last.check.brokenRules.length, 1)
		: 0;

/**
 * Whether the generation stored a gap for this shift and day, as the API
 * looks it up for the engine's repair options; a gap a hand edit made has
 * none, so those options cannot be asked for it.
 */
export const generationStoredGap = (
	findings: GenerationFindings | null,
	gap: CoverGapRequest
): boolean =>
	(findings?.conflicts ?? []).some(
		(conflict) =>
			conflict.employeeUuid === null &&
			conflict.date === gap.day &&
			conflict.shiftUuids.includes(gap.shiftId)
	);
