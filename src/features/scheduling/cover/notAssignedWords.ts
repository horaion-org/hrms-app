import type { TFunction } from "i18next";
import type {
	NotAssignedPerson,
	NotAssignedReason,
} from "@/features/scheduling/cover/engineRepairApi";
import { isOneOf } from "@/common/isOneOf";
import { ruleNameLabel } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";

/*
 * Why the engine put nobody else on a short shift, in the app's words, pure:
 * the API sends a reason code per person, and the app writes every line.
 */

const key = "scheduling.cover.engine.whyNot";

/** The reason that names the rule the shift would break. */
const BREAKS_RULE = "breaks_rule";

/** The app's own reason, in place of the engine's "on leave", for a part-timer with no shift that day (`coverWithEngine`). */
export const NO_SHIFT_PART_TIME = "no_shift_part_time";

/** The reason for a rule the engine does not name, which a broken rule nobody can name reads as too. */
const BREAKS_UNNAMED_RULE = "breaks_unnamed_rule";

/** The other reason codes the app has a sentence for; any code not here reads as a plain "Cannot take this shift." */
const WORDED_REASONS = [
	"role_not_on_shift",
	"fixed_day_no_call_back",
	"on_leave",
	"outside_availability",
	"works_another_shift",
	BREAKS_UNNAMED_RULE,
	"not_checked",
	"needs_overtime",
	NO_SHIFT_PART_TIME,
] as const;

type WordedReason = (typeof WORDED_REASONS)[number];

/** Whether the app has a sentence for the reason code. */
const isWordedReason = (code: string): code is WordedReason =>
	isOneOf(WORDED_REASONS, code);

/** The rule a reason would break: the company's constraint name, else what the rule is called; undefined when neither names it. */
const brokenRuleName = (
	reason: NotAssignedReason,
	t: TFunction
): string | undefined =>
	reason.constraintName ??
	(reason.rule === null ? undefined : ruleNameLabel(reason.rule, t));

/** One reason as a plain sentence; a broken rule nothing names reads as "Would break a working-time rule." */
export const notAssignedReasonLine = (
	reason: NotAssignedReason,
	t: TFunction
): string => {
	const rule =
		reason.code === BREAKS_RULE ? brokenRuleName(reason, t) : undefined;
	if (rule) return t(`${key}.breaksRule`, { rule });
	const code = reason.code === BREAKS_RULE ? BREAKS_UNNAMED_RULE : reason.code;
	return isWordedReason(code)
		? t(`${key}.reason.${code}`)
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

/**
 * The people of the why-not list who have no card of their own, in the
 * engine's order: someone an option already changes is not listed again.
 */
export const whyNotWithoutCards = (
	people: ReadonlyArray<NotAssignedPerson>,
	profileIdsWithCards: ReadonlySet<string>
): Array<NotAssignedPerson> =>
	people.filter((person) => !profileIdsWithCards.has(person.memberProfileId));
