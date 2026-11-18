import type {
	BrokenRule,
	RosterRulesCheck,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import type { ScheduleConstraint } from "@/features/scheduling/schedules/api";

/*
 * The rules check before publishing, pure. A broken locked company rule
 * holds Publish back and says why; anything else only warns; a check that
 * could not be made never blocks.
 */

/** How long the publish dialog waits for the check before publishing is allowed unchecked. */
export const PUBLISH_CHECK_WAIT_MS = 20_000;

/** The roster check as the dialog has it: its answer, still asked, or not coming (refused, failed or too slow). */
export type CheckRead = RosterRulesCheck | "loading" | "unavailable";

/** What tells a locked rule from another: a frozen constraint's id and whether the schedule must apply it. */
export type ConstraintLock = Pick<
	ScheduleConstraint,
	"constraintId" | "locked"
>;

/** The schedule's frozen constraints as the dialog has them: read, still asked, or not readable. */
export type LocksRead =
	ReadonlyArray<ConstraintLock> | "loading" | "unavailable";

/** What the check says of publishing. */
export type PublishCheck =
	| { kind: "checking" }
	/** The check was refused, could not tell, or took too long: publishing is allowed, with a warning. */
	| { kind: "unchecked" }
	| {
			kind: "holds";
			/** The roster's staffing gaps, when the check worked them out. */
			gaps: number | undefined;
	  }
	| {
			kind: "broken";
			/** Broken rules the schedule must apply (locked company rules): these hold Publish back. */
			locked: Array<BrokenRule>;
			/** Every other broken rule: these warn. */
			other: Array<BrokenRule>;
			gaps: number | undefined;
	  };

/** Stands for a roster the engine calls broken while naming no rule; it reads as a rule the app has no name for. */
const UNNAMED_RULE: BrokenRule = {
	rule: "",
	constraintId: null,
	constraintName: null,
	violations: null,
};

/**
 * What the roster check says of publishing. A broken rule is locked only
 * when its `constraintId` is one of the frozen constraints marked `locked`;
 * a rule with no id, a roster broken with no rule named, and constraints
 * that could not be read all count as not locked, so they warn.
 */
export const publishCheckOf = (
	check: CheckRead,
	locks: LocksRead
): PublishCheck => {
	if (check === "loading") return { kind: "checking" };
	if (check === "unavailable" || check.status === "UNCHECKED")
		return { kind: "unchecked" };
	const gaps = check.staffingGaps?.length;
	if (check.status === "HOLDS") return { kind: "holds", gaps };
	// Which broken rules are locked is known only once the constraints are read.
	if (locks === "loading") return { kind: "checking" };
	const lockedIds = new Set(
		locks === "unavailable"
			? []
			: locks
					.filter((constraint) => constraint.locked)
					.map((constraint) => constraint.constraintId)
	);
	const isLocked = (rule: BrokenRule): boolean =>
		rule.constraintId !== null && lockedIds.has(rule.constraintId);
	const broken =
		check.brokenRules.length > 0 ? check.brokenRules : [UNNAMED_RULE];
	return {
		kind: "broken",
		locked: broken.filter(isLocked),
		other: broken.filter((rule) => !isLocked(rule)),
		gaps,
	};
};

/** Whether Publish is held back: while the check runs, and while a locked rule is broken. */
export const holdsPublishBack = (check: PublishCheck): boolean =>
	check.kind === "checking" ||
	(check.kind === "broken" && check.locked.length > 0);

/** The staffing gaps the check found, to say how many shifts are short; undefined when it did not work them out. */
export const gapsOf = (check: PublishCheck): number | undefined =>
	check.kind === "holds" || check.kind === "broken" ? check.gaps : undefined;

/**
 * How many people and days a broken rule is broken for: each violation is one
 * person, on every day the check lists for them, or on one day when it lists
 * none; zero when the engine could not say who and when.
 */
export const violationCountOf = (rule: BrokenRule): number =>
	(rule.violations ?? []).reduce(
		(total, violation) => total + (violation.days?.length ?? 1),
		0
	);
