import type {
	RosterRulesCheck,
	RuleViolation,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import { brokenRuleCount } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";
import type {
	LastValidation,
	RosterValidation,
} from "@/features/scheduling/rulesCheck/useRosterRulesCheck";
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

/**
 * Whether the list is out of date with no validation in this visit: hand
 * changes nothing has checked yet (a validation is not kept past a reload),
 * so the list holds only what the generation found and must not read as clean.
 */
export const changesUnchecked = (
	standing: ValidationStanding,
	last: LastValidation | undefined
): boolean => standing === "outOfDate" && last === undefined;

/**
 * Whether the page should validate the roster now, without being asked: the
 * viewer may validate this roster (Validate schedule's own target: the
 * permission, a roster that may be changed, its run and unit known), its hand
 * changes are unchecked in this visit, and nothing was asked at this revision
 * yet (an ask in flight, answered or refused is never repeated).
 */
export const validatesOnOpen = ({
	mayValidate,
	revision,
	last,
	hasChanges,
	askedAt,
}: {
	mayValidate: boolean;
	revision: number;
	last: LastValidation | undefined;
	hasChanges: boolean;
	askedAt: number | undefined;
}): boolean =>
	mayValidate &&
	askedAt !== revision &&
	changesUnchecked(validationStanding({ revision, last, hasChanges }), last);

/**
 * Whether a check is due at the revision on screen: one was answered in this
 * visit at an earlier revision, and nothing is asked at this one yet (an ask
 * in flight, answered or refused is never repeated).
 */
export const checkDue = (
	validation: Pick<RosterValidation, "status" | "last" | "revision">
): boolean =>
	validation.status === "idle" &&
	validation.last !== undefined &&
	validation.last.revision !== validation.revision;

/** Whether the check for the revision on screen is on its way: under way, or due. */
export const checkPending = (
	validation: Pick<RosterValidation, "status" | "last" | "revision">
): boolean => validation.status === "loading" || checkDue(validation);

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
