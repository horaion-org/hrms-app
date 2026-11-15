import type { TFunction } from "i18next";
import type {
	NotAssignedPerson,
	NotAssignedReason,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	brokenRuleLabel,
	LABELLED_RULES,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";

/*
 * Why the engine put nobody else on a short shift, in the app's words, pure:
 * the API sends a reason code per person, and the app writes every line.
 */

const key = "scheduling.cover.engine.whyNot";

/** The reason that names the rule the shift would break. */
const BREAKS_RULE = "breaks_rule";

/** The other reason codes the app has a sentence for; any code not here reads as a plain "Cannot take this shift." */
const WORDED_REASONS = [
	"fixed_day_no_call_back",
	"on_leave",
	"outside_availability",
	"too_little_shift_left",
	"works_another_shift",
	"breaks_unnamed_rule",
	"not_checked",
	"needs_overtime",
] as const;

type WordedReason = (typeof WORDED_REASONS)[number];

const isWordedReason = (code: string): code is WordedReason =>
	(WORDED_REASONS as ReadonlyArray<string>).includes(code);

const isLabelledRule = (rule: string | null): boolean =>
	rule !== null && (LABELLED_RULES as ReadonlyArray<string>).includes(rule);

/** The rule a reason would break: the company's constraint name, else the app's label for the engine's rule, else "a working-time rule". */
const brokenRuleName = (reason: NotAssignedReason, t: TFunction): string =>
	reason.constraintName || isLabelledRule(reason.rule)
		? brokenRuleLabel({ ...reason, rule: reason.rule ?? "" }, t)
		: t(`${key}.aWorkingTimeRule`);

/** One reason as a plain sentence. */
export const notAssignedReasonLine = (
	reason: NotAssignedReason,
	t: TFunction
): string => {
	if (reason.code === BREAKS_RULE)
		return t(`${key}.breaksRule`, { rule: brokenRuleName(reason, t) });
	return isWordedReason(reason.code)
		? t(`${key}.reason.${reason.code}`)
		: t(`${key}.otherReason`);
};

/** The reason of someone who could take the shift only as overtime, which a generated roster never assigns. */
const NEEDS_OVERTIME = "needs_overtime";

/** Whether the person could take the shift: as the engine says, or only as overtime, which is not a refusal. */
export const couldTakeTheShift = (person: NotAssignedPerson): boolean =>
	person.couldTake ||
	person.reasons.some((reason) => reason.code === NEEDS_OVERTIME);

/** People who could take the shift first, then the rest, each in the engine's order. */
export const notAssignedInOrder = (
	people: ReadonlyArray<NotAssignedPerson>
): Array<NotAssignedPerson> => [
	...people.filter((person) => couldTakeTheShift(person)),
	...people.filter((person) => !couldTakeTheShift(person)),
];
