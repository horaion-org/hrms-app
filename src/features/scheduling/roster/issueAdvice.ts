import type { TFunction } from "i18next";
import {
	CONSTRAINT_TYPES,
	type ConstraintType,
} from "@/features/scheduling/constraints/api";
import { CONSTRAINT_TYPE_CATALOGUE } from "@/features/scheduling/constraints/constraintTypeCatalogue";
import type { RosterIssue } from "@/features/scheduling/roster/rosterIssueGroups";

/*
 * What a manager can do about an Issues item, pure: one line chosen by the
 * item's one action (Find cover) or by the type of the rule behind it. The
 * words live under `scheduling.issues.advice`; an item with nothing honest
 * to advise gets none.
 */

const key = "scheduling.issues.advice";

/** Every line of advice, by its key under `scheduling.issues.advice`. */
export const ISSUE_ADVICE_KEYS = [
	"findCover",
	"staffByHand",
	"daysOff",
	"requiredDays",
	"avoidDayOff",
	"restBetweenShifts",
	"restBetweenShiftsHours",
	"pattern",
	"daysInARow",
	"lessThatDay",
	"lessThatWeek",
	"lessThatMonth",
	"callBacks",
	"noExtraHours",
	"keepDaysOffTogether",
	"cantWorkShift",
	"oneShiftADay",
	"overtimeNeedsShift",
	"overtimeJoined",
	"preferences",
	"daysInRole",
	"dayType",
	"startTimeChange",
	"validate",
] as const;

export type IssueAdviceKey = (typeof ISSUE_ADVICE_KEYS)[number];

/** One line of advice: its key, the values the item itself carries, and whether a neighbouring schedule is part of it. */
export type IssueAdvice = {
	key: IssueAdviceKey;
	/** Only values read from the item; never a number the item does not state. */
	values?: { hours: number };
	/** The engine's sentence reaches into the schedule before or after this one, so its days may be changed instead. */
	neighbouringDays: boolean;
};

/** Why a rule type has no advice, so leaving one out is a decision and never an oversight. */
export type NoAdviceReason =
	"engineSaysWhatToDo" | "neverAnIssue" | "nothingToChangeOnTheRoster";

/** A rule type's advice, or the reason it has none. */
export type RuleAdvice = IssueAdviceKey | { none: NoAdviceReason };

/** A shift short of people: Find cover when the row offers it, else by hand. */
const STAFFING: RuleAdvice = "staffByHand";

/** The advice of each constraint type a manager or the company's work policy sets. */
export const ADVICE_BY_CONSTRAINT_TYPE: Record<ConstraintType, RuleAdvice> = {
	SHIFT_STAFFING: STAFFING,
	SHIFT_STAFFING_WITH_STAND_INS: STAFFING,
	ROLE_PRESENCE: STAFFING,
	DAYS_OFF_PER_PERIOD: "daysOff",
	AVOID_DAYS_OFF_ON: "avoidDayOff",
	REST_BETWEEN_SHIFTS: "restBetweenShifts",
	BANNED_SHIFT_PATTERN: "pattern",
	MAX_DAYS_WITHOUT_DAY_TYPES: "daysInARow",
	DAY_TYPE_DAYS_PER_WEEK: "requiredDays",
	MAX_WORK_HOURS_PER_DAY: "lessThatDay",
	MAX_OVERTIME_HOURS_PER_MONTH: "lessThatMonth",
	// Retired, and a setting of how leave splits a shift: no roster check reports it.
	SHORTEST_PART_SHIFT: { none: "neverAnIssue" },
	MAX_CALL_BACKS_PER_PERSON: "callBacks",
	// Pay settings: nothing on a roster breaks them.
	PAY_RATES: { none: "neverAnIssue" },
	NO_OVERTIME_WHEN_GENERATING: "noExtraHours",
	// A Find cover setting: nothing on a roster breaks it.
	OVERTIME_STRETCH: { none: "neverAnIssue" },
	KEEP_DAYS_OFF_TOGETHER: "keepDaysOffTogether",
};

/** The advice of each engine rule that is no constraint type, by the engine's rule name. */
export const ADVICE_BY_ENGINE_RULE: ReadonlyMap<string, RuleAdvice> = new Map<
	string,
	RuleAdvice
>([
	["most_days_a_week", "lessThatWeek"],
	["overtime_past_the_normal_day", "lessThatDay"],
	["overtime_past_the_normal_week", "lessThatWeek"],
	["overtime_respects_daily_work_cap", "lessThatDay"],
	// Its sentence ends "Take shifts off them in that period." or "Give them more shifts in that period."
	["work_minutes_per_period", { none: "engineSaysWhatToDo" }],
	["impossible_shift_assignment_is_zero", "cantWorkShift"],
	["at_most_one_role_assignment_per_day", "oneShiftADay"],
	["overtime_requires_base_shift", "overtimeNeedsShift"],
	["overtime_extension_is_contiguous", "overtimeJoined"],
	["shift_preference_fairness", "preferences"],
	["timeblock_demand_coverage", STAFFING],
	["employee_role_requirement_per_horizon", "daysInRole"],
	["non_working_day_requires_off_day_type", "dayType"],
	// The engine's own bookkeeping of overtime and working days: a manager has no cell to change for it.
	["overtime_credit_partition", { none: "nothingToChangeOnTheRoster" }],
	["shift_change_penalty_indicator", "startTimeChange"],
	[
		"working_day_follows_shift_assignment",
		{ none: "nothingToChangeOnTheRoster" },
	],
]);

/** Each name the engine reports a constraint type's rule by, and that type. */
const CONSTRAINT_TYPE_BY_ENGINE_RULE: ReadonlyMap<string, ConstraintType> =
	new Map(
		CONSTRAINT_TYPES.flatMap((type) =>
			CONSTRAINT_TYPE_CATALOGUE[type].engineRuleNames.map(
				(rule) => [rule, type] as const
			)
		)
	);

/**
 * A rule's advice by any name it goes by (the engine's rule name or the
 * constraint type's code), or undefined for a name the app does not know.
 */
export const ruleAdviceOf = (rule: string): RuleAdvice | undefined => {
	const type =
		CONSTRAINT_TYPE_BY_ENGINE_RULE.get(rule) ??
		CONSTRAINT_TYPES.find((constraintType) => constraintType === rule);
	if (type) return ADVICE_BY_CONSTRAINT_TYPE[type];
	return ADVICE_BY_ENGINE_RULE.get(rule);
};

/** How the engine's sentence says a shift or a run lies in the schedule before or after this one. */
const NEIGHBOURING_SCHEDULE_CLAUSES = [
	"which is in the schedule after this one",
	"into the schedule after this one",
	"before the schedule",
] as const;

/** The whole hours of rest the engine's sentence asks for: "less than 12 hours of rest". */
const REST_HOURS_ASKED = /less than (\d+) hours of rest/;

/** The rest advice, with the hours only when the item's own sentence states them. */
const restAdviceOf = (
	sentence: string
): Pick<IssueAdvice, "key" | "values"> => {
	const hours = REST_HOURS_ASKED.exec(sentence)?.[1];
	return hours === undefined
		? { key: "restBetweenShifts" }
		: { key: "restBetweenShiftsHours", values: { hours: Number(hours) } };
};

/**
 * What the manager can do about an Issues item, or undefined when there is
 * nothing honest to advise. A row that offers Find cover says so; a note for
 * information has nothing to fix; a rule is advised by its type; an engine
 * sentence naming no rule is sent to Validate schedule, which names it.
 */
export const issueAdviceOf = (issue: RosterIssue): IssueAdvice | undefined => {
	if (issue.group === "forInformation") return undefined;
	if (issue.action.kind === "findCover")
		return { key: "findCover", neighbouringDays: false };
	if (issue.subject === undefined) return undefined;
	if (issue.subject.kind === "generationError")
		return { key: "validate", neighbouringDays: false };
	const advice = ruleAdviceOf(issue.subject.rule);
	if (advice === undefined || typeof advice !== "string") return undefined;
	return {
		...(advice === "restBetweenShifts"
			? restAdviceOf(issue.rule)
			: { key: advice }),
		neighbouringDays: NEIGHBOURING_SCHEDULE_CLAUSES.some((clause) =>
			issue.rule.includes(clause)
		),
	};
};

/**
 * The advice as the row's one line: "What to do:", its sentence, and the
 * neighbouring days when the engine's sentence reaches into them.
 */
export const issueAdviceLine = (advice: IssueAdvice, t: TFunction): string => {
	const sentence = t(`${key}.${advice.key}`, advice.values);
	return t(`${key}.lead`, {
		advice: advice.neighbouringDays
			? t(`${key}.withNeighbouringDays`, { advice: sentence })
			: sentence,
	});
};
