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

/** One row of the Issues tab: who or what and when on its first line, why and what to do on its second. */
export type RosterIssue = {
	key: string;
	group: IssueGroup;
	/** The person's name, "1 <job title> short", a note's title, or "Whole roster" for a rule naming no one. */
	who: string;
	/** The member it is about, when it names one. */
	memberProfileId: string | null;
	/** The ISO day it is about, when it names one. */
	day: string | null;
	/** "09:00–15:00" for a shift short, otherwise null. */
	time: string | null;
	/** Why it is listed and, where there is something to do, what to do, the rule's name last. */
	rule: string;
	/** What to do when the item names no person and no day, shown where the day would be. */
	hint?: string;
	action: IssueAction;
};

/** A note with nothing to fix: a short title, then what it means and what to do. */
export type IssueNote = { title: string; detail: string };

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

/** One key per shift and day left short, so it is listed once whoever names it. */
export const gapIssueKey = (
	shiftId: string | undefined,
	day: string
): string | undefined => (shiftId ? `gap|${shiftId}|${day}` : undefined);

/** "09:00" from "2026-10-17T09:00". */
const clockOf = (dateTime: string): string => dateTime.slice(11, 16);

const gapIssue = (
	gap: StaffingGap,
	{ roleNames, ruleNames, t }: RosterIssueInput
): RosterIssue => {
	const shiftId = gap.shiftUuids[0];
	return {
		key: gapIssueKey(shiftId, gap.date) ?? `gap|${gap.conflictId}`,
		group: "mustFix",
		who: t(`${key}.jobShort`, {
			count: gap.missing,
			job: roleNames.get(gap.roleUuid) ?? t(`${key}.unknownJob`),
		}),
		memberProfileId: null,
		day: gap.date,
		time: `${clockOf(gap.start)}–${clockOf(gap.end)}`,
		rule: t(`${key}.shortOnRule`, {
			count: gap.missing,
			rule: ruleLabel(
				{ name: gap.sourceRule, constraintId: gap.sourceRuleId },
				ruleNames,
				t
			),
		}),
		action: shiftId
			? { kind: "findCover", gap: { shiftId, day: gap.date } }
			: { kind: "show" },
	};
};

/** What to do about a rule the engine could not place: a hint only when it names no person and no day. */
const hintWithoutPlace = (
	employeeId: string | null,
	date: string | null,
	t: TFunction
): string | undefined =>
	employeeId === null && date === null
		? t(`${key}.ruleWithoutPlace`)
		: undefined;

/** Why a rule's item is listed: a must broken, or a rule asked "if possible" not met. */
const RULE_REASON_KEYS = {
	mustFix: "scheduling.issues.brokenMust",
	notMet: "scheduling.issues.notMetRule",
} as const;

/** One item per person and day a rule names, or one for the whole roster when it names none. */
const ruleIssues = (
	rule: BrokenRule,
	group: "mustFix" | "notMet",
	{ memberNames, t }: RosterIssueInput
): Array<RosterIssue> => {
	const reason = t(RULE_REASON_KEYS[group], {
		rule: brokenRuleLabel(rule, t),
	});
	const violations = rule.violations ?? [];
	if (violations.length === 0) {
		return [
			{
				key: `${group}|${rule.rule}|${reason}`,
				group,
				who: t(`${key}.wholeRoster`),
				memberProfileId: null,
				day: null,
				time: null,
				rule: reason,
				hint: hintWithoutPlace(null, null, t),
				action: { kind: "show" },
			},
		];
	}
	return violations.map((violation) => ({
		key: `${group}|${rule.rule}|${reason}|${violation.employeeId ?? ""}|${violation.date ?? ""}`,
		group,
		who: violation.employeeId
			? (memberNames.get(violation.employeeId) ??
				t("scheduling.detail.formerMember"))
			: t(`${key}.wholeRoster`),
		memberProfileId: violation.employeeId,
		day: violation.date,
		time: null,
		rule: reason,
		hint: hintWithoutPlace(violation.employeeId, violation.date, t),
		action: { kind: "show" },
	}));
};

const noteIssue = ({ title, detail }: IssueNote): RosterIssue => ({
	key: `note|${title}|${detail}`,
	group: "forInformation",
	who: title,
	memberProfileId: null,
	day: null,
	time: null,
	rule: detail,
	action: { kind: "show" },
});

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
