import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import type {
	BrokenRule,
	StaffingGap,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import { ruleLabel } from "@/features/scheduling/roster/findings/ruleLabel";
import { brokenRuleLabel } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";

/*
 * The Issues tab sorted by what to do, pure: shifts short and musts broken
 * are to fix, rules asked "if possible" could not be met, and notes have
 * nothing to fix. Each item says who (or which job title is short), the day
 * and time, the rule in plain words and its one action.
 */

const key = "scheduling.issues";

/** The three groups, in the order Issues shows them. */
export const ISSUE_GROUPS = ["mustFix", "notMet", "forInformation"] as const;

export type IssueGroup = (typeof ISSUE_GROUPS)[number];

/** The groups that stay closed until the person opens them: notes with nothing to fix. */
export const GROUPS_STARTING_CLOSED: ReadonlyArray<IssueGroup> = [
	"forInformation",
];

/** The one action an item offers: outline it on the grid, or find cover for a shift left short. */
export type IssueAction =
	{ kind: "show" } | { kind: "findCover"; gap: CoverGapRequest };

/**
 * What stands behind an item, which its advice is chosen by: a rule by the
 * engine's name for it, or a generation's error, which names no rule.
 */
export type IssueSubject =
	| {
			kind: "rule";
			rule: string;
			/** The schedule's frozen constraint behind a broken rule, when the check names it. */
			constraintId?: string | null;
	  }
	| { kind: "generationError" };

/** One row of the Issues tab: who or what and when on its first line, why and what to do on its second. */
export type RosterIssue = {
	key: string;
	group: IssueGroup;
	/** The person's name, "1 <job title> short", a note's title, or "Whole roster" for a rule naming no one. */
	who: string;
	/** The member it is about, when it names one. */
	memberProfileId: string | null;
	/** The ISO day it is about, when it names one; the first of `days`. */
	day: string | null;
	/** Every ISO day, in order, when one row stands for the same finding on several days. */
	days?: ReadonlyArray<string>;
	/** "09:00–15:00" for a shift short, otherwise null. */
	time: string | null;
	/** Why it is listed and, where there is something to do, what to do, the rule's name last. */
	rule: string;
	/** What kind of fact it is, in a few plain words ("Shifts short"), which a folded group counts by. */
	topic: string;
	action: IssueAction;
	/** The rule or engine error behind the item; left out for the roster's own lists and notes. */
	subject?: IssueSubject;
};

/** A note with nothing to fix: a short title, then what it means and what to do, and its kind. */
export type IssueNote = { title: string; detail: string; topic: string };

/** The kinds of fact the app words itself; the engine's setup notes go by their own kind. */
export type IssueTopic =
	| "shiftsShort"
	| "rulesBroken"
	| "notMet"
	| "daysToDecide"
	| "clashes"
	| "leaveAndCover"
	| "inARow"
	| "dayNotes"
	| "startChanged"
	| "fromGeneration";

/** A kind of fact in plain words. */
export const issueTopic = (topic: IssueTopic, t: TFunction): string =>
	t(`${key}.topics.${topic}`);

/** Each group's rule rows, by kind. */
const RULE_TOPICS = { mustFix: "rulesBroken", notMet: "notMet" } as const;

/** What the Issues groups are built from: today's panel inputs. */
export type RosterIssueInput = {
	/** Shifts left short: the last validation's gaps, else the generation's conflicts. */
	gaps: ReadonlyArray<StaffingGap>;
	/** The musts broken, with who and which days when known. */
	brokenMusts: ReadonlyArray<BrokenRule>;
	/** The rules asked "if possible" that were not met. */
	notMet: ReadonlyArray<BrokenRule>;
	/** Roster notes with nothing to fix, already in words. */
	notes: ReadonlyArray<IssueNote>;
	/**
	 * Items already built from the roster's other lists (days to decide,
	 * leave and cover, starting points), listed first so a shift short
	 * named by a person's leave wins over the same gap by job title.
	 */
	extras?: ReadonlyArray<RosterIssue>;
	/** Member names by member profile id. */
	memberNames: ReadonlyMap<string, string>;
	/** Job title names by role id. */
	roleNames: ReadonlyMap<string, string>;
	/** The schedule's constraint names by constraint copy id, which name a gap's rule. */
	ruleNames: ReadonlyMap<string, string>;
	t: TFunction;
};

/** How every shift-short item's key starts, whoever names the gap. */
const GAP_KEY_PREFIX = "gap|";

/** One key per shift and day left short, so it is listed once whoever names it. */
export const gapIssueKey = (
	shiftId: string | undefined,
	day: string
): string | undefined =>
	shiftId ? `${GAP_KEY_PREFIX}${shiftId}|${day}` : undefined;

/** "09:00" from "2026-10-17T09:00". */
const clockOf = (dateTime: string): string => dateTime.slice(11, 16);

const gapIssue = (
	gap: StaffingGap,
	{ roleNames, ruleNames, t }: RosterIssueInput
): RosterIssue => {
	const shiftId = gap.shiftUuids[0];
	return {
		key: gapIssueKey(shiftId, gap.date) ?? `${GAP_KEY_PREFIX}${gap.conflictId}`,
		group: "mustFix",
		topic: issueTopic("shiftsShort", t),
		who: t(`${key}.jobShort`, {
			count: gap.missing,
			job: roleNames.get(gap.roleUuid) ?? t(`${key}.unknownJob`),
		}),
		memberProfileId: null,
		day: gap.date,
		time: `${clockOf(gap.start)}–${clockOf(gap.end)}`,
		rule: t(`${key}.ruleOnly`, {
			rule: ruleLabel(
				{ name: gap.sourceRule, constraintId: gap.sourceRuleId },
				ruleNames,
				t
			),
		}),
		action: shiftId
			? { kind: "findCover", gap: { shiftId, day: gap.date } }
			: { kind: "show" },
		subject: { kind: "rule", rule: gap.sourceRule },
	};
};

/** Why a rule's item is listed: a must broken, or a rule asked "if possible" not met. */
const RULE_REASON_KEYS = {
	mustFix: "scheduling.issues.brokenMust",
	notMet: "scheduling.issues.notMetRule",
} as const;

/** The same, for a rule the engine could not place on a person or a day. */
const PLACELESS_REASON_KEYS = {
	mustFix: "scheduling.issues.brokenSomewhere",
	notMet: "scheduling.issues.notMetSomewhere",
} as const;

/**
 * Why a rule's item is listed: the engine's own sentences about that person
 * and day, then the rule's name; the generic reason only when it sent none.
 */
const ruleReason = (
	group: "mustFix" | "notMet",
	ruleName: string,
	messages: ReadonlyArray<string>,
	t: TFunction
): string =>
	messages.length > 0
		? t(`${key}.ruleSentence`, { sentence: messages.join(" "), rule: ruleName })
		: t(RULE_REASON_KEYS[group], { rule: ruleName });

/**
 * A rule that names no person and no day: the rule's name first, then the
 * engine's sentences, or one short line saying it could not say where.
 */
const placelessRuleIssue = (
	rule: BrokenRule,
	group: "mustFix" | "notMet",
	ruleName: string,
	messages: ReadonlyArray<string>,
	t: TFunction
): RosterIssue => ({
	key: `${group}|${rule.rule}|${ruleName}|${messages.join(" ")}`,
	group,
	topic: issueTopic(RULE_TOPICS[group], t),
	who: ruleName,
	memberProfileId: null,
	day: null,
	time: null,
	rule:
		messages.length > 0 ? messages.join(" ") : t(PLACELESS_REASON_KEYS[group]),
	action: { kind: "show" },
	subject: { kind: "rule", rule: rule.rule },
});

type RuleViolation = NonNullable<BrokenRule["violations"]>[number];

/** One person's violations of a rule that say the same: the days, in order, and the sentences once. */
type SameFinding = {
	employeeId: string;
	days: Array<string>;
	messages: ReadonlyArray<string>;
};

/**
 * A rule's violations about a person and a day, joined where the person and
 * the sentences are the same: the engine sends one per day, but it is one
 * thing to fix. Different sentences stay apart. Pure.
 */
const sameFindings = (
	violations: ReadonlyArray<RuleViolation>
): Array<SameFinding> => {
	const findings = new Map<string, SameFinding>();
	for (const { employeeId, date, days, messages } of violations) {
		if (employeeId === null || date === null) continue;
		const findingKey = JSON.stringify([employeeId, messages]);
		const finding = findings.get(findingKey) ?? {
			employeeId,
			days: [],
			messages,
		};
		// Validate sends every day the person breaks the rule on; an answer per day sends only `date`.
		finding.days.push(
			...(days !== undefined && days.length > 0 ? days : [date])
		);
		findings.set(findingKey, finding);
	}
	return [...findings.values()].map((finding) => ({
		...finding,
		days: [...new Set(finding.days)].sort(),
	}));
};

/** One item per person and day a rule names, or one by the rule's name when it names neither. */
const ruleIssues = (
	rule: BrokenRule,
	group: "mustFix" | "notMet",
	{ memberNames, t }: RosterIssueInput
): Array<RosterIssue> => {
	const ruleName = brokenRuleLabel(rule, t);
	const violations = rule.violations ?? [];
	if (violations.length === 0)
		return [placelessRuleIssue(rule, group, ruleName, [], t)];
	const whoOf = (employeeId: string): string =>
		memberNames.get(employeeId) ?? t("scheduling.detail.formerMember");
	const placed = sameFindings(violations).map(
		({ employeeId, days, messages }): RosterIssue => ({
			key: `${group}|${rule.rule}|${ruleName}|${employeeId}|${messages.join(" ")}`,
			group,
			topic: issueTopic(RULE_TOPICS[group], t),
			who: whoOf(employeeId),
			memberProfileId: employeeId,
			day: days[0] ?? null,
			days,
			time: null,
			rule: ruleReason(group, ruleName, messages, t),
			action: { kind: "show" },
			subject: {
				kind: "rule",
				rule: rule.rule,
				constraintId: rule.constraintId,
			},
		})
	);
	// A violation missing its person or its day stands alone, as it can't be joined to another.
	const unplaced = violations.filter(
		(violation) => violation.employeeId === null || violation.date === null
	);
	return [
		...placed,
		...unplaced.map((violation): RosterIssue => {
			if (violation.employeeId === null && violation.date === null)
				return placelessRuleIssue(rule, group, ruleName, violation.messages, t);
			return {
				key: `${group}|${rule.rule}|${ruleName}|${violation.employeeId ?? ""}|${violation.date ?? ""}`,
				group,
				topic: issueTopic(RULE_TOPICS[group], t),
				who: violation.employeeId
					? whoOf(violation.employeeId)
					: t(`${key}.wholeRoster`),
				memberProfileId: violation.employeeId,
				day: violation.date,
				time: null,
				rule: ruleReason(group, ruleName, violation.messages, t),
				action: { kind: "show" },
				subject: { kind: "rule", rule: rule.rule },
			};
		}),
	];
};

const noteIssue = ({ title, detail, topic }: IssueNote): RosterIssue => ({
	key: `note|${title}|${detail}`,
	group: "forInformation",
	topic,
	who: title,
	memberProfileId: null,
	day: null,
	time: null,
	rule: detail,
	action: { kind: "show" },
});

/** The next ISO day after `day`. */
const nextDay = (day: string): string =>
	dayjs(day).add(1, "day").format("YYYY-MM-DD");

/**
 * Several days as a run when each follows the last ("Mon, Feb 1 – Sun, Feb
 * 7"), else as a list ("Mon, Feb 1 and Wed, Feb 3"); one day as itself.
 * `formatOne` writes a day the way the page does. Pure.
 */
export const dayListText = (
	days: ReadonlyArray<string>,
	formatOne: (day: string) => string,
	t: TFunction
): string => {
	const [first, ...rest] = days;
	if (first === undefined) return "";
	const last = rest[rest.length - 1];
	if (last === undefined) return formatOne(first);
	const isRun = days.every(
		(day, index) => index === 0 || day === nextDay(days[index - 1] ?? "")
	);
	if (isRun)
		return t(`${key}.dayRun`, { from: formatOne(first), to: formatOne(last) });
	return t("scheduling.constraints.list", { items: days.map(formatOne) });
};

/** Keeps the first item of each key, so nothing is listed twice. */
const onceEach = (issues: ReadonlyArray<RosterIssue>): Array<RosterIssue> => {
	const seen = new Set<string>();
	return issues.filter((issue) => {
		if (seen.has(issue.key)) return false;
		seen.add(issue.key);
		return true;
	});
};

/** Every issue, once each: the extras, shifts short and musts broken, then rules not met, then notes. */
export const rosterIssues = (input: RosterIssueInput): Array<RosterIssue> =>
	onceEach([
		...(input.extras ?? []),
		...input.gaps.map((gap) => gapIssue(gap, input)),
		...input.brokenMusts.flatMap((rule) => ruleIssues(rule, "mustFix", input)),
		...input.notMet.flatMap((rule) => ruleIssues(rule, "notMet", input)),
		...input.notes.map(noteIssue),
	]);

/** How many items each group holds. */
export const issueCounts = (
	issues: ReadonlyArray<RosterIssue>
): Record<IssueGroup, number> => ({
	mustFix: issues.filter((issue) => issue.group === "mustFix").length,
	notMet: issues.filter((issue) => issue.group === "notMet").length,
	forInformation: issues.filter((issue) => issue.group === "forInformation")
		.length,
});

/**
 * How many shifts are still short, as Issues lists them: one per shift and
 * day, whether a job title's gap or a person's leave names it. Pure.
 */
export const shortShiftCount = (issues: ReadonlyArray<RosterIssue>): number =>
	issues.filter((issue) => issue.key.startsWith(GAP_KEY_PREFIX)).length;

/** One part of the Issues summary line, drawn in its group's tone. */
export type IssueSummaryPart = { group: IssueGroup; text: string };

/** "3 to fix", "2 could not be met", "1 for information": one part per group with items, none when all are empty. */
export const issueSummaryParts = (
	counts: Record<IssueGroup, number>,
	t: TFunction
): Array<IssueSummaryPart> =>
	ISSUE_GROUPS.filter((group) => counts[group] > 0).map((group) => ({
		group,
		text: t(`${key}.summary.${group}`, { count: counts[group] }),
	}));

/** How many items of each kind, in the order each kind first appears. */
export const topicCounts = (
	issues: ReadonlyArray<RosterIssue>
): Array<{ topic: string; count: number }> => {
	const counts = new Map<string, number>();
	for (const { topic } of issues)
		counts.set(topic, (counts.get(topic) ?? 0) + 1);
	return [...counts].map(([topic, count]) => ({ topic, count }));
};

/** A folded group's one line: "Rest carried in from before: 2 · Days before changed: 1". */
export const topicGist = (
	issues: ReadonlyArray<RosterIssue>,
	t: TFunction
): string =>
	topicCounts(issues)
		.map((part) => t(`${key}.topicCount`, part))
		.join(" · ");

/** Orders items by person or by day. */
export type IssueOrder = "byPerson" | "byDay";

// An item with no day sorts after those with one.
const dayOrder = (day: string | null): string => day ?? "9999-12-31";

const compareByPerson = (first: RosterIssue, second: RosterIssue): number =>
	first.who.localeCompare(second.who) ||
	dayOrder(first.day).localeCompare(dayOrder(second.day));

const compareByDay = (first: RosterIssue, second: RosterIssue): number =>
	dayOrder(first.day).localeCompare(dayOrder(second.day)) ||
	first.who.localeCompare(second.who);

/** The items in the order asked, the input left as it is. */
export const orderedIssues = (
	issues: ReadonlyArray<RosterIssue>,
	order: IssueOrder
): Array<RosterIssue> =>
	[...issues].sort(order === "byPerson" ? compareByPerson : compareByDay);

/** One group's items, in the order asked. */
export const issuesOfGroup = (
	issues: ReadonlyArray<RosterIssue>,
	group: IssueGroup,
	order: IssueOrder
): Array<RosterIssue> =>
	orderedIssues(
		issues.filter((issue) => issue.group === group),
		order
	);
