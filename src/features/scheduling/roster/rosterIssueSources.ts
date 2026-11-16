import type { TFunction } from "i18next";
import { formatDay } from "@/common/formatDay";
import { timeRangeText } from "@/features/leave/dayPortion";
import { diagnosticSentence } from "@/features/scheduling/roster/findings/diagnostics";
import {
	gapIssueKey,
	rosterIssues,
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
	/** The working days in a row each member brought into the period. */
	startingRuns?: ReadonlyMap<string, number>;
	/** Lines said above the list, such as the week before having changed. */
	noteLines: ReadonlyArray<string>;
	t: TFunction;
	/** The locale dates are written in (`formattingLocale`). */
	language: string;
};

/** A broken roster whose rules the engine did not name, listed once for the whole roster. */
const UNNAMED_RULE: BrokenRule = {
	rule: "unnamed",
	constraintId: null,
	constraintName: null,
	violations: null,
};

const nameOf = (row: ScheduleAssignment, t: TFunction): string =>
	row.member?.displayName ?? t("scheduling.detail.formerMember");

/** A day a manager must decide, to fix. */
const toDecideIssue = (row: ScheduleAssignment, t: TFunction): RosterIssue => ({
	key: `decide|${row.assignmentId}`,
	group: "mustFix",
	who: nameOf(row, t),
	memberProfileId: row.member?.memberProfileId ?? null,
	day: row.day,
	time: null,
	rule: t(
		row.flag === "NEEDS_ATTENTION"
			? "scheduling.rosterMarkers.needsAttention"
			: "scheduling.rosterMarkers.needsDecision"
	),
	action: { kind: "show" },
});

/** A day on leave or covered: to fix with Find cover while its shift is short, else for information. */
const leaveAndCoverIssue = (
	row: ScheduleAssignment,
	t: TFunction
): RosterIssue => {
	const markerKey = row.flag ? LEAVE_MARKER_KEYS[row.flag] : undefined;
	const marker = markerKey
		? t(`scheduling.rosterMarkers.${markerKey}`)
		: t("scheduling.detail.leaveAndCover");
	const shift = row.uncoveredShift;
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
		time:
			row.uncoveredFrom && row.uncoveredTo
				? timeRangeText(row.uncoveredFrom, row.uncoveredTo, t)
				: null,
		rule: t("scheduling.rosterMarkers.needsCover", { shift: shift.name }),
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
	t,
}: RosterIssueSourceInput): Array<RosterIssue> => [
	...toDecide.map((row) => toDecideIssue(row, t)),
	...leaveAndCover.map((row) => leaveAndCoverIssue(row, t)),
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

/** The findings' own lines about a person: a conflict naming them, or an error the check did not replace. */
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
			who: who(conflict.employeeUuid),
			memberProfileId: conflict.employeeUuid,
			day: conflict.date,
			time: null,
			rule: conflict.message,
			action: { kind: "show" },
		}));
	const errors = (withErrors ? findings.errors : []).flatMap((violation) =>
		violation.messages.map((message): RosterIssue => ({
			key: `error|${violation.employeeId ?? ""}|${violation.date ?? ""}|${message}`,
			group: "mustFix",
			who: who(violation.employeeId),
			memberProfileId: violation.employeeId,
			day: violation.date,
			time: null,
			rule: message,
			action: { kind: "show" },
		}))
	);
	return [...conflicts, ...errors];
};

/** The engine's notes on the schedule's setup, in the app's words where it knows them. */
const setupNotes = ({
	roster: { findings, names },
	t,
	language,
}: RosterIssueSourceInput): Array<string> =>
	(findings?.diagnostics ?? []).map(
		(diagnostic) =>
			(names &&
				diagnosticSentence(diagnostic, names, t, (date) =>
					formatDay(date, language)
				)) ??
			diagnostic.message
	);

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
		extras: [...listIssues(input), ...findingIssues(input, !saysWho)],
		gaps: (roster.findings?.conflicts ?? []).filter(
			(conflict) => conflict.employeeUuid === null
		),
		brokenMusts: brokenMustsOf(check),
		notMet: check?.notMet ?? [],
		notes: [...noteLines, ...setupNotes(input)],
		memberNames: roster.names?.members ?? new Map<string, string>(),
		roleNames: roster.names?.jobTitles ?? new Map<string, string>(),
		t,
	});
};
