import type { TFunction } from "i18next";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	dayListText,
	gapIssueKey,
	issueTopic,
	type IssueGroup,
	type RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";

/*
 * The Issues panel's one list, pure: every issue of the roster and of the
 * last rules check (`rosterIssues`, which lists the same thing once) as a row
 * of a few words: how much it matters, what is wrong, where, and its one
 * action. Must-fix rows first, then rules asked "if possible", then notes,
 * each in date order.
 */

/** How much a row matters: it must be fixed, a rule asked "if possible" was not met, or a note to read. */
export type IssueSeverity = "mustFix" | "ifPossible" | "note";

/** A row's one action: cover a short shift, make the fix Issues knows, or read its details. */
export type IssueRowAction = "cover" | "fix" | "details";

/** One row of the Issues panel. */
export type IssueRow = {
	key: string;
	severity: IssueSeverity;
	/** What is wrong, in a few words: "1 Cook short", "Most days a week". */
	what: string;
	/** Who, when and which shifts: "Thu, Dec 3 · Mid 12:00–20:00", "Mei Wong · Mon, Nov 30". */
	where: string;
	action: IssueRowAction;
	/** The issue the row stands for, which its open part reads. */
	issue: RosterIssue;
};

/** The panel's filters. */
export const ISSUE_FILTERS = ["all", "mustFix", "ifPossible"] as const;

export type IssueFilter = (typeof ISSUE_FILTERS)[number];

/** Each issue group's severity. */
const SEVERITY_OF_GROUP: Record<IssueGroup, IssueSeverity> = {
	mustFix: "mustFix",
	notMet: "ifPossible",
	forInformation: "note",
};

/** The severities in the order the list shows them. */
const SEVERITY_ORDER: ReadonlyArray<IssueSeverity> = [
	"mustFix",
	"ifPossible",
	"note",
];

/** What building the rows needs besides the issues. */
export type IssueRowSources = {
	/** Whether Issues can make the fix for this issue key itself (a day type to change). */
	hasFix: (issueKey: string) => boolean;
	/** A shift's name by its id, for a short shift's "where"; empty when unknown. */
	shiftName: (shiftId: string) => string;
	/** A day as the page writes it. */
	formatOne: (day: string) => string;
	t: TFunction;
};

/** The row's one action: cover for a short shift, fix when Issues knows the fix, otherwise details. */
const actionOf = (
	issue: RosterIssue,
	hasFix: IssueRowSources["hasFix"]
): IssueRowAction => {
	if (issue.action.kind === "findCover") return "cover";
	return hasFix(issue.key) ? "fix" : "details";
};

/**
 * What is wrong in a few words: a short job title ("1 Cook short"), a
 * person's leave that leaves a shift short ("On leave, so Mid is short."),
 * a rule's name, or the kind of fact for anything else.
 */
const whatOf = (issue: RosterIssue): string => {
	if (issue.action.kind === "findCover")
		return issue.memberProfileId === null ? issue.who : issue.rule;
	return issue.ruleName ?? issue.topic;
};

/**
 * Who and when: a short shift's day, every shift its rule counts across and
 * the time ("Mon, Nov 23 · Shift B and Shift F 13:00–02:00"); a person's name
 * and days; a rule's days alone.
 */
const whereOf = (
	issue: RosterIssue,
	{ shiftName, formatOne, t }: IssueRowSources
): string => {
	const days = issue.days ?? (issue.day ? [issue.day] : []);
	const when = days.length > 0 ? dayListText(days, formatOne, t) : undefined;
	if (issue.action.kind === "findCover") {
		const shiftNames = (issue.shiftIds ?? [issue.action.gap.shiftId])
			.map(shiftName)
			.filter(Boolean);
		const shifts =
			shiftNames.length > 0
				? t("scheduling.constraints.list", { items: shiftNames })
				: undefined;
		const shift = [shifts, issue.time].filter(Boolean).join(" ");
		return [when, shift].filter(Boolean).join(" · ");
	}
	// A rule's row already names the rule as its "what"; its "who" is then the person, or the rule again.
	const who = issue.who === issue.ruleName ? undefined : issue.who;
	return [who, when].filter(Boolean).join(" · ");
};

// A row with no day sorts after those with one.
const dayOrder = (day: string | null): string => day ?? "9999-12-31";

/** Severity first, then day, then what, so the list reads the same each time. */
const compareRows = (first: IssueRow, second: IssueRow): number =>
	SEVERITY_ORDER.indexOf(first.severity) -
		SEVERITY_ORDER.indexOf(second.severity) ||
	dayOrder(first.issue.day).localeCompare(dayOrder(second.issue.day)) ||
	first.what.localeCompare(second.what);

/** Every issue as a row of the panel, in the panel's order. */
export const issueRows = (
	issues: ReadonlyArray<RosterIssue>,
	sources: IssueRowSources
): Array<IssueRow> =>
	issues
		.map(
			(issue): IssueRow => ({
				key: issue.key,
				severity: SEVERITY_OF_GROUP[issue.group],
				what: whatOf(issue),
				where: whereOf(issue, sources),
				action: actionOf(issue, sources.hasFix),
				issue,
			})
		)
		.sort(compareRows);

/** The rows a filter shows: every row for All, else the rows of that severity. */
export const rowsOfFilter = (
	rows: ReadonlyArray<IssueRow>,
	filter: IssueFilter
): Array<IssueRow> =>
	filter === "all" ? [...rows] : rows.filter((row) => row.severity === filter);

/** How many rows must be fixed, which the panel's header counts. */
export const mustFixCount = (rows: ReadonlyArray<IssueRow>): number =>
	rows.filter((row) => row.severity === "mustFix").length;

/**
 * The issues with a row for the short shift "Find cover" was pressed for,
 * when none names it yet (a gap made since the last check): "Front Desk AM
 * short", must fix, opening to its options. The issues as they are without.
 */
export const withGapIssue = (
	issues: ReadonlyArray<RosterIssue>,
	gap: CoverGapRequest | undefined,
	shiftName: (shiftId: string) => string,
	t: TFunction
): Array<RosterIssue> => {
	const key = gap && gapIssueKey(gap.shiftId, gap.day);
	if (!gap || !key || issues.some((issue) => issue.key === key))
		return [...issues];
	return [
		...issues,
		{
			key,
			group: "mustFix",
			topic: issueTopic("shiftsShort", t),
			who: t("scheduling.issues.panel.shiftShort", {
				shift: shiftName(gap.shiftId),
			}),
			memberProfileId: null,
			day: gap.day,
			time: null,
			rule: "",
			action: { kind: "findCover", gap },
		},
	];
};
