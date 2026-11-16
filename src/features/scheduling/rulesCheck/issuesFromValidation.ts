import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type {
	RosterRulesCheck,
	RuleViolation,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import { brokenRuleCount } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type { LastValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
import type { RosterSchedule } from "@/features/scheduling/roster/rosterView";
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
 * Whether the check says who and which days (an API that reports the rules
 * not met "if possible" and read the roster): then its musts' violations
 * stand for the generation's.
 */
export const validationSaysWho = (check: RosterRulesCheck): boolean =>
	check.notMet !== null;

/** Every person and day the check's broken musts are placed on, as a generation's findings list violations. */
const mustViolations = (check: RosterRulesCheck): Array<RuleViolation> =>
	check.brokenRules.flatMap((rule) => rule.violations ?? []);

/** The generation's members, then those only the check names, once each. */
const membersOfBoth = (
	generation: GenerationFindings["members"],
	check: RosterRulesCheck["members"]
): GenerationFindings["members"] => {
	const known = new Set(generation.map((member) => member.memberProfileId));
	return [
		...generation,
		...check.filter((member) => !known.has(member.memberProfileId)),
	];
};

/**
 * The findings Issues shows: the generation's, with its conflicts replaced by
 * the last validation's gaps when it worked them out, and its violations by
 * the validation's broken musts (who and which days, with the members they
 * name) when it says who; the generation's own when nothing was validated or
 * neither could be worked out. The rules not met "if possible" are never
 * findings: Issues lists them apart (`notMetItems`).
 */
export const findingsShown = (
	findings: GenerationFindings | null,
	last: LastValidation | undefined
): GenerationFindings | null => {
	if (!last) return findings;
	const { check } = last;
	const gaps = check.staffingGaps;
	const saysWho = validationSaysWho(check);
	if (gaps === null && !saysWho) return findings;
	const base = findings ?? NO_FINDINGS;
	return {
		...base,
		conflicts: gaps ?? base.conflicts,
		errors: saysWho ? mustViolations(check) : base.errors,
		members: saysWho
			? membersOfBoth(base.members, check.members)
			: base.members,
	};
};

/**
 * The schedule as Issues reads it: its generation's findings as
 * `findingsShown` gives them; the same schedule when they are unchanged or
 * there is no generation.
 */
export const scheduleWithFindingsShown = <Shown extends RosterSchedule>(
	schedule: Shown,
	last: LastValidation | undefined
): Shown => {
	if (!schedule.generation) return schedule;
	const findings = findingsShown(schedule.generation.findings, last);
	return findings === schedule.generation.findings
		? schedule
		: { ...schedule, generation: { ...schedule.generation, findings } };
};

/**
 * How many issues the last validation's broken musts add beyond the findings,
 * so each is counted once: when it says who, only the rules with no person
 * or day listed (those are counted by their lines in the findings), and one
 * when broken with none named; otherwise one per rule named. The rules not
 * met "if possible" never count.
 */
export const brokenRuleIssueCount = (
	last: LastValidation | undefined
): number => {
	if (!last) return 0;
	const { check } = last;
	if (!validationSaysWho(check)) return brokenRuleCount(check);
	if (check.status !== "BROKEN") return 0;
	if (check.brokenRules.length === 0) return 1;
	return check.brokenRules.filter((rule) => !rule.violations?.length).length;
};

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
