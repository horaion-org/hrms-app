import type { TFunction } from "i18next";
import { formatDay } from "@/common/formatDay";
import { timeRangeText } from "@/features/leave/dayPortion";
import {
	diagnosticLabel,
	diagnosticSentence,
	diagnosticSubject,
} from "@/features/scheduling/roster/findings/diagnostics";
import {
	gapIssueKey,
	issueTopic,
	rosterIssues,
	type IssueNote,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import type { RosterView } from "@/features/scheduling/roster/rosterView";
import { LEAVE_MARKER_KEYS } from "@/features/scheduling/roster/rosterMarks";
import {
	leaveLineText,
	leavePortionOf,
} from "@/features/scheduling/roster/roster";
import { validationSaysWho } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import type {
	BrokenRule,
	RosterRulesCheck,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * Where each Issues item comes from, pure: the findings shown (the last
 * validation's gaps and musts over the generation's), the rules not met,
 * and the roster's own lists. Days to decide and shifts left short by leave
 * are to fix; other leave and cover, starting points, the engine's setup
 * notes and the lines above the list are for information.
 */

/** What the Issues items are read from. */
export type RosterIssueSourceInput = {
	roster: Pick<
		RosterView,
		"rows" | "findings" | "names" | "leaveAndCover" | "toDecide"
	>;
	/** The last validation's answer, when there is one. */
	check: RosterRulesCheck | undefined;
	/**
	 * The gaps the rules check for the roster's revision found, by
	 * `gapIssueKey`; left out when no check is current or it did not work
	 * them out. A shift left short by leave that it does not list is staffed.
	 */
	checkedGaps?: ReadonlySet<string>;
	/** The working days in a row each member brought into the period. */
	startingRuns?: ReadonlyMap<string, number>;
	/** Notes about the whole list, such as the week before having changed. */
	noteLines: ReadonlyArray<IssueNote>;
	t: TFunction;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
};

/** A broken roster whose rules the engine did not name, listed once for the whole roster under the app's name for an unnamed rule. */
const UNNAMED_RULE: BrokenRule = {
	rule: "unnamed",
	constraintId: null,
	constraintName: null,
	violations: null,
};

/**
 * How the engine starts each message of a rule asked "if possible" that gave
 * way: a rule not met, never a must broken.
 */
const IF_POSSIBLE_NOT_MET = "If possible, not met: ";

const nameOf = (row: ScheduleAssignment, t: TFunction): string =>
	row.member?.displayName ?? t("scheduling.detail.formerMember");

/**
 * A day a manager must decide, to fix, saying what to do as the day editor
 * does: give the person a shift or confirm the day off.
 */
const toDecideIssue = (row: ScheduleAssignment, t: TFunction): RosterIssue => {
	const name = nameOf(row, t);
	return {
		key: `decide|${row.assignmentId}`,
		group: "mustFix",
		topic: issueTopic("daysToDecide", t),
		who: name,
		memberProfileId: row.member?.memberProfileId ?? null,
		day: row.day,
		time: null,
		rule: t(
			row.flag === "NEEDS_ATTENTION"
				? "scheduling.rosterEdit.needsAttention"
				: "scheduling.rosterEdit.needsDecision",
			{ name }
		),
		action: { kind: "show" },
	};
};

/**
 * A day on leave or covered: to fix with Find cover while its shift is short,
 * else for information. The current rules check, when it has one, says
 * whether the shift is still short. The sentence names the person when they
 * are the only one whose leave left that shift short that day.
 */
const leaveAndCoverIssue = (
	row: ScheduleAssignment,
	onLeaveFromShift: number,
	checkedGaps: ReadonlySet<string> | undefined,
	t: TFunction
): RosterIssue => {
	const markerKey = row.flag ? LEAVE_MARKER_KEYS[row.flag] : undefined;
	const marker = markerKey
		? t(`scheduling.rosterMarkers.${markerKey}`)
		: t("scheduling.detail.leaveAndCover");
	const uncovered = row.uncoveredShift;
	const shift =
		uncovered &&
		(checkedGaps === undefined ||
			checkedGaps.has(gapIssueKey(uncovered.shiftId, row.day) ?? ""))
			? uncovered
			: undefined;
	const base = {
		who: nameOf(row, t),
		memberProfileId: row.member?.memberProfileId ?? null,
		day: row.day,
	};
	if (!shift)
		return {
			...base,
			key: `leave|${row.assignmentId}`,
			group: "forInformation",
			topic: issueTopic("leaveAndCover", t),
			time: null,
			rule: row.leaveTypeName
				? `${marker}: ${leaveLineText(row.leaveTypeName, leavePortionOf(row), t)}`
				: marker,
			action: { kind: "show" },
		};
	return {
		...base,
		key: gapIssueKey(shift.shiftId, row.day) ?? `leave|${row.assignmentId}`,
		group: "mustFix",
		topic: issueTopic("shiftsShort", t),
		time:
			row.uncoveredFrom && row.uncoveredTo
				? timeRangeText(row.uncoveredFrom, row.uncoveredTo, t)
				: null,
		rule:
			onLeaveFromShift === 1
				? t("scheduling.issues.leaveShortNamed", {
						name: base.who,
						shift: shift.name,
					})
				: t("scheduling.issues.leaveShort", { shift: shift.name }),
		action: {
			kind: "findCover",
			gap: { shiftId: shift.shiftId, day: row.day },
		},
	};
};

/** The roster's own lists as items: days to decide, leave and cover, and starting points. */
const listIssues = ({
	roster: { rows, toDecide, leaveAndCover },
	startingRuns,
	checkedGaps,
	t,
}: RosterIssueSourceInput): Array<RosterIssue> => [
	...toDecide.map((row) => toDecideIssue(row, t)),
	...leaveAndCover.map((row) =>
		leaveAndCoverIssue(
			row,
			leaveAndCover.filter(
				(other) =>
					other.uncoveredShift?.shiftId === row.uncoveredShift?.shiftId &&
					other.day === row.day
			).length,
			checkedGaps,
			t
		)
	),
	...rows.flatMap((row): Array<RosterIssue> => {
		const run =
			row.memberProfileId === undefined
				? undefined
				: startingRuns?.get(row.memberProfileId);
		if (run === undefined) return [];
		const name = row.name ?? t("scheduling.detail.formerMember");
		return [
			{
				key: `start|${row.key}`,
				group: "forInformation",
				topic: issueTopic("inARow", t),
				who: name,
				memberProfileId: row.memberProfileId ?? null,
				day: null,
				time: null,
				rule: t("scheduling.detail.workedInARow", { name, count: run }),
				action: { kind: "show" },
			},
		];
	}),
];

/**
 * The findings' own lines about a person: a conflict naming them, or an error
 * the check did not replace. An error marked "if possible" could not be met;
 * every other one is to fix.
 */
const findingIssues = (
	{ roster: { findings, names }, t }: RosterIssueSourceInput,
	withErrors: boolean
): Array<RosterIssue> => {
	if (!findings) return [];
	const members = names?.members ?? new Map<string, string>();
	const who = (employeeId: string | null): string =>
		employeeId === null
			? t("scheduling.issues.wholeRoster")
			: (members.get(employeeId) ?? t("scheduling.detail.formerMember"));
	const conflicts = findings.conflicts
		.filter((conflict) => conflict.employeeUuid !== null)
		.map((conflict): RosterIssue => ({
			key: `conflict|${conflict.conflictId}`,
			group: "mustFix",
			topic: issueTopic("clashes", t),
			who: who(conflict.employeeUuid),
			memberProfileId: conflict.employeeUuid,
			day: conflict.date,
			time: null,
			rule: conflict.message ?? t("scheduling.issues.conflict"),
			action: { kind: "show" },
			subject: { kind: "rule", rule: conflict.sourceRule },
		}));
	const errors = (withErrors ? findings.errors : []).flatMap((violation) =>
		violation.messages.map((message): RosterIssue => ({
			key: `error|${violation.employeeId ?? ""}|${violation.date ?? ""}|${message}`,
			...(message.startsWith(IF_POSSIBLE_NOT_MET)
				? { group: "notMet", topic: issueTopic("notMet", t) }
				: { group: "mustFix", topic: issueTopic("rulesBroken", t) }),
			who: who(violation.employeeId),
			memberProfileId: violation.employeeId,
			day: violation.date,
			time: null,
			rule: message,
			action: { kind: "show" },
			subject: { kind: "generationError" },
		}))
	);
	// A day's message from the engine names something to look at, not to fix.
	const dayMessages = findings.assignmentMessages.flatMap(
		({ employeeId, day, messages }) =>
			messages.map((message): RosterIssue => ({
				key: `message|${employeeId}|${day}|${message}`,
				group: "forInformation",
				topic: issueTopic("dayNotes", t),
				who: who(employeeId),
				memberProfileId: employeeId,
				day,
				time: null,
				rule: message,
				action: { kind: "show" },
			}))
	);
	return [...conflicts, ...errors, ...dayMessages];
};

/**
 * The engine's notes on the schedule's setup, for information: who or what
 * each is about and its day first, then the app's sentence where it knows
 * the note, else the engine's.
 */
const setupNoteIssues = ({
	roster: { findings, names },
	t,
	language,
}: RosterIssueSourceInput): Array<RosterIssue> =>
	(findings?.diagnostics ?? []).map((diagnostic) => {
		const detail =
			(names &&
				diagnosticSentence(diagnostic, names, t, (date) =>
					formatDay(date, language)
				)) ??
			diagnostic.message;
		return {
			...diagnosticSubject(diagnostic, names, t),
			key: `setup|${diagnostic.code}|${detail}`,
			group: "forInformation",
			topic: diagnosticLabel(diagnostic.code, t),
			time: null,
			rule: detail,
			action: { kind: "show" },
		};
	});

/** The musts the check found broken: its named rules, or one for the whole roster when it named none. */
const brokenMustsOf = (
	check: RosterRulesCheck | undefined
): Array<BrokenRule> => {
	if (check?.status !== "BROKEN") return [];
	return check.brokenRules.length > 0 ? check.brokenRules : [UNNAMED_RULE];
};

/**
 * Every Issues item, once each. The generation's errors stand only while no
 * check has said who: once it has, its broken musts name the same people
 * and days, with the rule.
 */
export const issuesOfRoster = (
	input: RosterIssueSourceInput
): Array<RosterIssue> => {
	const { roster, check, noteLines, t } = input;
	const saysWho = check !== undefined && validationSaysWho(check);
	return rosterIssues({
		extras: [
			...listIssues(input),
			...findingIssues(input, !saysWho),
			...setupNoteIssues(input),
		],
		gaps: (roster.findings?.conflicts ?? []).filter(
			(conflict) => conflict.employeeUuid === null
		),
		brokenMusts: brokenMustsOf(check),
		notMet: check?.notMet ?? [],
		notes: noteLines,
		memberNames: roster.names?.members ?? new Map<string, string>(),
		roleNames: roster.names?.jobTitles ?? new Map<string, string>(),
		ruleNames: roster.names?.rules ?? new Map<string, string>(),
		t,
	});
};
