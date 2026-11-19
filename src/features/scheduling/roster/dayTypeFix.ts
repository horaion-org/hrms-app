import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { mondayOf } from "@/common/weeks";
import { CONSTRAINT_TYPE_CATALOGUE } from "@/features/scheduling/constraints/constraintTypeCatalogue";
import type {
	IssueSubject,
	RosterIssue,
} from "@/features/scheduling/roster/rosterIssueGroups";
import type {
	RosterChangeCell,
	RosterCheck,
} from "@/features/scheduling/rosterChanges/api";
import type { RosterChangeRefusal } from "@/features/scheduling/rosterChanges/rosterChangeRefusal";
import {
	isLeaveDay,
	needsDecision,
} from "@/features/scheduling/rosterChanges/rosterLeave";
import type {
	ScheduleAssignment,
	ScheduleConstraint,
} from "@/features/scheduling/schedules/api";

/*
 * The fix Issues can suggest for a rule asking "at least N days of one day
 * type each week", pure: when the person has a day not worked of another
 * type in that week, retype that day. Nothing here reads the engine's
 * sentence. Who and which week come from the broken rule's own position (the
 * item's member and day: the engine marks the person on the week's first day
 * inside the schedule); the day type needed comes from the rule's frozen
 * constraint, found by the broken rule's constraint id.
 */

/** The constraint type whose rule counts days of a day type each week. */
const WEEKLY_DAY_TYPE_RULE = "DAY_TYPE_DAYS_PER_WEEK";

/** The last day of a Monday-first week, counted from its Monday. */
const LAST_DAY_OF_WEEK_OFFSET = 6;

/** One day not worked to retype so a weekly day-type rule is met. */
export type DayTypeRetype = {
	/** The Issues item it mends. */
	issueKey: string;
	/** The frozen constraint whose rule it mends. */
	constraintId: string;
	membershipId: string;
	memberProfileId: string;
	/** The ISO day to retype. */
	day: string;
	/** The type the day has now, as a code. */
	from: string;
	/** The type the rule needs, as a code. */
	to: string;
};

/** What a suggestion is worked out from: the roster on the page and its frozen setup. */
export type DayTypeFixSources = {
	/** The schedule's frozen constraints, which hold each rule's values. */
	constraints: ReadonlyArray<
		Pick<ScheduleConstraint, "constraintId" | "values">
	>;
	/** The roster's rows. */
	assignments: ReadonlyArray<ScheduleAssignment>;
	/** The schedule's types for a day not worked, as codes. */
	nonWorkingDayTypes: ReadonlyArray<string>;
};

/** Whether a rule, by any name it goes by, is the weekly day-type rule. */
const isWeeklyDayTypeRule = (rule: string): boolean =>
	rule === WEEKLY_DAY_TYPE_RULE ||
	CONSTRAINT_TYPE_CATALOGUE[WEEKLY_DAY_TYPE_RULE].engineRuleNames.includes(
		rule
	);

/**
 * The one day type a broken rule needs more days of, or undefined when it
 * cannot be known for sure: the rule is not the weekly day-type rule, its
 * frozen constraint is not on the page, it does not ask for "at least", or
 * it counts several day types.
 */
export const neededDayTypeOf = (
	subject: IssueSubject | undefined,
	constraints: DayTypeFixSources["constraints"]
): string | undefined => {
	if (subject?.kind !== "rule" || !isWeeklyDayTypeRule(subject.rule))
		return undefined;
	const constraint = constraints.find(
		({ constraintId }) => constraintId === subject.constraintId
	);
	if (!constraint) return undefined;
	const valuesOf = (field: string): Array<string> =>
		constraint.values
			.filter((value) => value.field === field)
			.map((value) => value.value);
	const [dayType, ...otherDayTypes] = valuesOf("DAY_TYPE");
	const asksAtLeast = valuesOf("COMPARISON").join() === "AT_LEAST";
	return asksAtLeast && otherDayTypes.length === 0 ? dayType : undefined;
};

/** The Sunday of the Monday-first week holding `day`. */
const lastDayOfWeek = (day: string): string =>
	dayjs(mondayOf(day))
		.add(LAST_DAY_OF_WEEK_OFFSET, "day")
		.format(ISO_DATE_FORMAT);

/**
 * Whether a roster day can be retyped to `needed`: a full-timer's day not
 * worked, of another of the schedule's non-working types, that is not leave
 * and not waiting for a manager's decision.
 */
const canRetype = (
	row: ScheduleAssignment,
	needed: string,
	nonWorkingDayTypes: ReadonlyArray<string>
): boolean =>
	row.shift === null &&
	row.offReason === "OFF" &&
	row.member?.partTime !== true &&
	!isLeaveDay(row) &&
	!needsDecision(row) &&
	row.dayType !== null &&
	row.dayType !== needed &&
	nonWorkingDayTypes.includes(row.dayType);

/**
 * The retype that mends one Issues item, or undefined when there is none to
 * suggest: the day type needed is not known for sure, the item names no
 * person or more than one day, or the person has no day to retype in that
 * week (they work every day, or are on leave on the others).
 *
 * The week is the item's day to the Sunday of its week, which lies inside the
 * rule's period however the engine lines its weeks up. Of several days that
 * could be retyped, the last one of the week is chosen.
 */
export const dayTypeRetypeOf = (
	issue: Pick<
		RosterIssue,
		"key" | "subject" | "memberProfileId" | "day" | "days"
	>,
	{ constraints, assignments, nonWorkingDayTypes }: DayTypeFixSources
): DayTypeRetype | undefined => {
	const needed = neededDayTypeOf(issue.subject, constraints);
	const firstDay = issue.day;
	if (needed === undefined || !nonWorkingDayTypes.includes(needed))
		return undefined;
	if (issue.subject?.kind !== "rule" || !issue.subject.constraintId)
		return undefined;
	if (issue.memberProfileId === null || firstDay === null) return undefined;
	if ((issue.days ?? []).length > 1) return undefined;
	const lastDay = lastDayOfWeek(firstDay);
	const chosen = assignments
		.filter(
			(row) =>
				row.member?.memberProfileId === issue.memberProfileId &&
				row.day >= firstDay &&
				row.day <= lastDay &&
				canRetype(row, needed, nonWorkingDayTypes)
		)
		.sort((first, second) => second.day.localeCompare(first.day))[0];
	if (!chosen?.member || chosen.dayType === null) return undefined;
	return {
		issueKey: issue.key,
		constraintId: issue.subject.constraintId,
		membershipId: chosen.member.membershipId,
		memberProfileId: chosen.member.memberProfileId,
		day: chosen.day,
		from: chosen.dayType,
		to: needed,
	};
};

/** Every item's retype, by the item's key; items with none are left out. */
export const dayTypeRetypes = (
	issues: ReadonlyArray<RosterIssue>,
	sources: DayTypeFixSources
): Map<string, DayTypeRetype> =>
	new Map(
		issues.flatMap((issue) => {
			const retype = dayTypeRetypeOf(issue, sources);
			return retype ? [[issue.key, retype] as const] : [];
		})
	);

/** The retypes of one rule that read the same way: one "fix them all" offer. */
export type DayTypeRetypeGroup = {
	key: string;
	from: string;
	to: string;
	retypes: Array<DayTypeRetype>;
	/** How many different people the retypes are for. */
	people: number;
};

/**
 * The retypes of the items listed, grouped by rule and by the types they
 * change from and to; only groups of two or more, as one alone has its own
 * button.
 */
export const dayTypeRetypeGroups = (
	issues: ReadonlyArray<Pick<RosterIssue, "key">>,
	retypes: ReadonlyMap<string, DayTypeRetype>
): Array<DayTypeRetypeGroup> => {
	const groups = new Map<string, Array<DayTypeRetype>>();
	for (const { key } of issues) {
		const retype = retypes.get(key);
		if (!retype) continue;
		const groupKey = [retype.constraintId, retype.from, retype.to].join("|");
		groups.set(groupKey, [...(groups.get(groupKey) ?? []), retype]);
	}
	return [...groups]
		.filter(([, group]) => group.length > 1)
		.map(([key, group]) => ({
			key,
			from: group[0]?.from ?? "",
			to: group[0]?.to ?? "",
			retypes: group,
			people: new Set(group.map((retype) => retype.memberProfileId)).size,
		}));
};

/** The cells a hand change sends for the retypes, one per person and day. */
export const retypeCells = (
	retypes: ReadonlyArray<DayTypeRetype>
): Array<RosterChangeCell> => {
	const cells = new Map<string, RosterChangeCell>();
	for (const { membershipId, day, to } of retypes)
		cells.set(`${membershipId}|${day}`, {
			membershipId,
			day,
			kind: "OFF",
			dayType: to,
		});
	return [...cells.values()];
};

/** The severities of a check that hold a change until a person answers them. */
const HOLDING_SEVERITIES: ReadonlyArray<RosterCheck["severity"]> = [
	"REFUSED",
	"NEEDS_REMARK",
	"NEEDS_ACKNOWLEDGEMENT",
];

/**
 * The cells no check holds: a check that refuses, or asks for a tick or a
 * remark, holds the cell of the person and day it names, or every cell of
 * its day when it names no person.
 */
export const cellsNotHeld = (
	cells: ReadonlyArray<RosterChangeCell>,
	checks: ReadonlyArray<RosterCheck>
): Array<RosterChangeCell> => {
	const holding = checks.filter(({ severity }) =>
		HOLDING_SEVERITIES.includes(severity)
	);
	return cells.filter(
		(cell) =>
			!holding.some(
				(check) =>
					check.day === cell.day &&
					(check.membershipId === null ||
						check.membershipId === cell.membershipId)
			)
	);
};

/** How the last fix ended when it did not simply go through, on the item or group it was pressed on. */
export type IssueFixOutcome = {
	/** The item's key, or the group's. */
	key: string;
	/** Why nothing was changed. */
	refusal?: RosterChangeRefusal;
	/** A group changed in part: how many of its days were changed. */
	done?: number;
	total?: number;
};

/** The fixes the Issues list offers, and how each is made. */
export type IssueFixes = {
	/** Each item's retype, by the item's key. */
	retypes: ReadonlyMap<string, DayTypeRetype>;
	/** Makes one item's retype: applies it, or on a published roster opens the day's editor with it chosen. */
	onFix: (retype: DayTypeRetype) => void;
	/** Makes every retype of a group in one change; left out on a published roster. */
	onFixAll?: (group: DayTypeRetypeGroup) => void;
	/** A fix is being made: every fix button waits. */
	busy: boolean;
	outcome?: IssueFixOutcome;
};
