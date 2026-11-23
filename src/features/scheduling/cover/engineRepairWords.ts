import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";
import type { RosterCellValue } from "@/features/scheduling/schedules/api";
import { formatTimeRange } from "@/features/scheduling/shifts/formatShift";
import { hoursFromMinutes } from "@/features/scheduling/shifts/shiftHours";
import { stretchedTimes } from "@/features/scheduling/shifts/shiftStretch";
import type {
	RepairOption,
	RepairShortSpan,
	RepairSpan,
} from "@/features/scheduling/cover/engineRepairApi";

/*
 * The engine's repair options in the app's words, pure: the API sends kinds,
 * cells, people and minutes, and the app writes every line (ADR-0003).
 */

const key = "scheduling.cover.engine";

/** Where a local date-time's clock time starts and ends: `yyyy-MM-ddTHH:mm…` → `HH:mm`. */
const CLOCK_TIME_START = 11;
const CLOCK_TIME_END = 16;

/** Why the engine's options can't be shown, as the section words it. */
export type RepairRefusal =
	| "notSeenByEngine"
	| "expired"
	| "notConnected"
	| "rosterMoved"
	| "tooSlow"
	| "failed";

/** The API's refusal codes, by what the section says. */
const REFUSALS: Record<string, RepairRefusal> = {
	REPAIR_GAP_NOT_SEEN_BY_ENGINE: "notSeenByEngine",
	REPAIR_GAP_EXPIRED: "expired",
	REPAIR_NO_ENGINE_JOB: "expired",
	REPAIR_ENGINE_NOT_CONFIGURED: "notConnected",
	ROSTER_REVISION_CONFLICT: "rosterMoved",
	REPAIR_ENGINE_TOO_SLOW: "tooSlow",
};

/** What a failed ask means; anything not named (the engine failing, an authorization failure, an outage) reads as the options not loaded, which a retry may mend. */
export const repairRefusalOf = (error: unknown): RepairRefusal =>
	(error instanceof ApiProblemError && error.errorCode
		? REFUSALS[error.errorCode]
		: undefined) ?? "failed";

/** A local date-time's clock time: "2026-11-10T07:00:00" → "07:00"; empty when unknown. */
export const clockTime = (dateTime: string | null): string =>
	dateTime === null ? "" : dateTime.slice(CLOCK_TIME_START, CLOCK_TIME_END);

/** A span as clock times: "07:00 – 09:00". */
const spanText = (span: RepairSpan, t: TFunction): string =>
	t("scheduling.timeRange", {
		start: clockTime(span.start),
		end: clockTime(span.end),
	});

/** Spans as clock times, joined: "09:00 – 11:00, 14:00 – 15:00". */
export const spansText = (
	spans: ReadonlyArray<RepairSpan>,
	t: TFunction
): string =>
	spans.map((span) => spanText(span, t)).join(t(`${key}.spanSeparator`));

/** What the words of an option read from the roster: a day as it stands now, a day's weekday, and the short shift's day. */
export type OptionWordSources = {
	/** What a changed day holds on the roster now; undefined for a day the roster does not hold. */
	dayBefore: (cell: RosterChangeCell) => RosterCellValue | undefined;
	/** A day's weekday in words, e.g. "Saturday". */
	weekday: (isoDate: string) => string;
	/** The short shift's day, as an ISO date: a stretch of a shift on another day names that shift. */
	gapDay: string;
};

/** A stretch's minutes after and before its shift, from its WORK cell; none from a cell of another kind. */
const stretchOf = (
	cell: RosterChangeCell | undefined
): { after: number; before: number } =>
	cell?.kind === "WORK"
		? {
				after: cell.stretchAfterMinutes ?? 0,
				before: cell.stretchBeforeMinutes ?? 0,
			}
		: { after: 0, before: 0 };

/** The sentences an option is said in, one per person (UX note 2026-11-22 §2.1). */
type SentenceKind =
	| "callIn"
	| "move"
	| "stretchAfter"
	| "stretchAfterOtherDay"
	| "stretchBefore"
	| "stretchBeforeOtherDay"
	| "daySwap"
	| "restDayMove";

/** The copy key of one person's sentence. */
export type OptionSentenceKey = `${typeof key}.sentence.${SentenceKind}`;

/** One person's part of an option, said in one sentence: its key and its values, but for the person's name. */
export type OptionSentence = {
	membershipId: string;
	key: OptionSentenceKey;
	values: Record<string, string | number>;
};

/** "Mary comes in on a day off": the day's type as the roster holds it now. */
const callInSentence = (
	cell: RosterChangeCell,
	{ dayBefore }: OptionWordSources,
	t: TFunction
): OptionSentence => ({
	membershipId: cell.membershipId,
	key: `${key}.sentence.callIn`,
	values: {
		dayType: dayTypeInSentence(dayBefore(cell)?.dayType ?? null, t),
	},
});

/** "Ben moves from Lunch Rush 11:00 – 13:00": the shift the roster has them on that day; none when it names none. */
const moveSentence = (
	cell: RosterChangeCell,
	{ dayBefore }: OptionWordSources,
	t: TFunction
): OptionSentence | undefined => {
	const shiftLeft = dayBefore(cell)?.shift;
	return shiftLeft
		? {
				membershipId: cell.membershipId,
				key: `${key}.sentence.move`,
				values: {
					shift: shiftLeft.name,
					times: formatTimeRange(shiftLeft, t),
				},
			}
		: undefined;
};

/**
 * "Ben stays on 2 h, until 15:00" or "Chen starts 2 h early, at 12:00": the
 * shift they work that day, stretched by the cell's minutes; on another day
 * than the short shift's, that shift is named with its weekday. None for a
 * stretch of no minutes, or a shift the roster does not name.
 */
const stretchSentence = (
	cell: RosterChangeCell,
	{ dayBefore, weekday, gapDay }: OptionWordSources
): OptionSentence | undefined => {
	const shift = dayBefore(cell)?.shift;
	const { after, before } = stretchOf(cell);
	if (!shift || (after === 0 && before === 0)) return undefined;
	const onGapDay = cell.day === gapDay;
	const values = { shift: shift.name, weekday: weekday(cell.day) };
	// The times worked, the shift's widened by the stretch; past midnight either way, as the roster draws it.
	const worked = stretchedTimes(
		{ start: shift.startTime, end: shift.endTime },
		{ beforeMinutes: before, afterMinutes: after }
	);
	if (after > 0)
		return {
			membershipId: cell.membershipId,
			key: onGapDay
				? `${key}.sentence.stretchAfter`
				: `${key}.sentence.stretchAfterOtherDay`,
			values: {
				...values,
				hours: hoursFromMinutes(after),
				time: worked.end,
			},
		};
	return {
		membershipId: cell.membershipId,
		key: onGapDay
			? `${key}.sentence.stretchBefore`
			: `${key}.sentence.stretchBeforeOtherDay`,
		values: {
			...values,
			hours: hoursFromMinutes(before),
			time: worked.start,
		},
	};
};

/** "Aisha works this shift instead of Friday Front Desk AM": the shift on the day given up; none when the roster names none. */
const daySwapSentence = (
	taken: RosterChangeCell,
	givenUp: RosterChangeCell,
	{ dayBefore, weekday }: OptionWordSources
): OptionSentence | undefined => {
	const shiftGivenUp = dayBefore(givenUp)?.shift;
	return shiftGivenUp
		? {
				membershipId: taken.membershipId,
				key: `${key}.sentence.daySwap`,
				values: { shift: shiftGivenUp.name, weekday: weekday(givenUp.day) },
			}
		: undefined;
};

/**
 * "Farid comes in on a rest day; Friday becomes their rest day": the gap's
 * day's type as the roster holds it now, and the weekday of the day off that
 * takes that type.
 */
const restDayMoveSentence = (
	taken: RosterChangeCell,
	takesTheType: RosterChangeCell,
	{ dayBefore, weekday }: OptionWordSources,
	t: TFunction
): OptionSentence => ({
	membershipId: taken.membershipId,
	key: `${key}.sentence.restDayMove`,
	values: {
		dayType: dayTypeInSentence(dayBefore(taken)?.dayType ?? null, t),
		weekday: weekday(takesTheType.day),
	},
});

/** Keeps a list only when every one of its sentences could be said. */
const allSaid = (
	sentences: ReadonlyArray<OptionSentence | undefined>
): Array<OptionSentence> | undefined =>
	sentences.length > 0 && sentences.every((sentence) => sentence !== undefined)
		? [...sentences]
		: undefined;

/**
 * An option said as one sentence per person, by its kind (UX note
 * 2026-11-22 §2.1): a call-in, a move, a stretch, a day swap, a rest-day
 * move; a pair of stretches as two, the one who stays on first. The day
 * taken is the option's WORK cell wherever it sits; a day swap's OFF cell is
 * the day given up, a rest-day move's the day that takes the gap's day's
 * type. Undefined when the option cannot be said (OTHER, a stretch of no
 * minutes, a shift the roster does not name): its card draws it instead.
 * Pure.
 */
export const optionSentences = (
	option: Pick<RepairOption, "kind" | "cells">,
	sources: OptionWordSources,
	t: TFunction
): Array<OptionSentence> | undefined => {
	const worked = option.cells.filter((cell) => cell.kind === "WORK");
	const [taken] = worked;
	if (!taken) return undefined;
	switch (option.kind) {
		case "CALL_IN":
			return [callInSentence(taken, sources, t)];
		case "MOVE":
			return allSaid([moveSentence(taken, sources, t)]);
		case "OVERTIME_STRETCH":
			return allSaid([stretchSentence(taken, sources)]);
		case "STRETCH_PAIR": {
			// The one who stays on after their shift comes first.
			const staysOnFirst = [...worked].sort(
				(first, second) => stretchOf(second).after - stretchOf(first).after
			);
			return allSaid(
				staysOnFirst.map((cell) => stretchSentence(cell, sources))
			);
		}
		case "DAY_SWAP": {
			const givenUp = option.cells.find((cell) => cell.kind === "OFF");
			return givenUp
				? allSaid([daySwapSentence(taken, givenUp, sources)])
				: undefined;
		}
		case "REST_DAY_MOVE": {
			const takesTheType = option.cells.find((cell) => cell.kind === "OFF");
			return takesTheType
				? [restDayMoveSentence(taken, takesTheType, sources, t)]
				: undefined;
		}
		default:
			return undefined;
	}
};

/** What an option costs, as a chip: within hours, a kind of extra minutes, or not checked against the rules. */
export type CostChipKind =
	| "withinHours"
	| "pastContract"
	| "overtime"
	| "restDayWork"
	| "timeOffEarned"
	| "notRuleChecked";

/** One cost chip: its kind (which decides its tone) and its words. */
export type CostChip = { kind: CostChipKind; text: string };

/** The kinds of extra minutes, in the order their chips show. */
const EXTRA_MINUTE_KINDS = [
	"pastContract",
	"overtime",
	"restDayWork",
	"timeOffEarned",
] as const satisfies ReadonlyArray<CostChipKind>;

/**
 * What an option costs as chips (UX note 2.4): one per kind of extra minutes
 * above zero ("+2 h overtime", "6 h on a rest day"), "Within hours" when none
 * is, nothing when the engine gave no figures; "Not rule-checked" last when
 * the option was not checked against the working-time rules. Pure.
 */
export const costChips = (
	option: Pick<RepairOption, "extraMinutes" | "workingTimeRulesChecked">,
	t: TFunction
): Array<CostChip> => {
	const minutes = option.extraMinutes;
	const extra = minutes
		? EXTRA_MINUTE_KINDS.filter((kind) => minutes[kind] > 0).map(
				(kind): CostChip => ({
					kind,
					text: t(`${key}.cost.${kind}`, {
						hours: hoursFromMinutes(minutes[kind]),
					}),
				})
			)
		: [];
	const cost: Array<CostChip> =
		minutes && extra.length === 0
			? [{ kind: "withinHours", text: t(`${key}.cost.withinHours`) }]
			: extra;
	return option.workingTimeRulesChecked
		? cost
		: [
				...cost,
				{ kind: "notRuleChecked", text: t(`${key}.cost.notRuleChecked`) },
			];
};

/** What an option leaves short: one person of several (neutral), or some hours (red). */
export type WhatItLeaves = { kind: "onePerson" | "part"; text: string };

/** The most people a set of spans is short. */
const mostShort = (spans: ReadonlyArray<RepairShortSpan>): number =>
	Math.max(0, ...spans.map((span) => span.shortBy));

/**
 * What an option leaves short (UX note 2.5), by its `fills`: nothing for the
 * whole gap or when the engine does not say; "Fills 1 of 2" for one person of
 * several, n being the most `shortNow` has short (nothing without `shortNow`);
 * "Still short 09:00 – 11:00" for some hours. Pure.
 */
export const whatItLeaves = (
	option: Pick<RepairOption, "fills" | "stillShort">,
	shortNow: ReadonlyArray<RepairShortSpan> | null,
	t: TFunction
): WhatItLeaves | undefined => {
	// "Fills 1 of n" counts n from what the roster has short now; without it nothing is said.
	if (option.fills === "ONE_PERSON")
		return shortNow && shortNow.length > 0
			? {
					kind: "onePerson",
					text: t(`${key}.leaves.onePerson`, { count: mostShort(shortNow) }),
				}
			: undefined;
	if (option.fills === "PART")
		return {
			kind: "part",
			text: t(`${key}.leaves.stillShort`, {
				times: spansText(option.stillShort, t),
			}),
		};
	return undefined;
};

/** A person's week as its line reads it; the hours-based list's week counts no leave. */
export type WeekLineMinutes = {
	before: number;
	after: number;
	contract: number;
	/** Minutes of approved leave counted inside `before` and `after`. */
	countedLeave?: number;
};

/** The week line's words: changed or left as it was, with leave counted inside it or without. */
const WEEK_LINE_KEYS = {
	changed: { plain: `${key}.weekLine`, withLeave: `${key}.weekLineWithLeave` },
	unchanged: {
		plain: `${key}.weekLineUnchanged`,
		withLeave: `${key}.weekLineUnchangedWithLeave`,
	},
} as const;

/**
 * A person's week before and after an option, in hours: "30 → 36 h of 44 h
 * this week"; a week the option leaves as it was, without the arrow: "30 h
 * of 44 h this week"; either ending ", incl. 8 h leave" when approved leave
 * is counted inside it, so the figure reads apart from the roster's hours.
 */
export const weekLine = (
	{ before, after, contract, countedLeave = 0 }: WeekLineMinutes,
	t: TFunction
): string => {
	const words =
		WEEK_LINE_KEYS[before === after ? "unchanged" : "changed"][
			countedLeave > 0 ? "withLeave" : "plain"
		];
	return t(words, {
		before: hoursFromMinutes(before),
		after: hoursFromMinutes(after),
		contract: hoursFromMinutes(contract),
		leave: hoursFromMinutes(countedLeave),
	});
};

/**
 * What a set of spans is still short, one count for all when they share it
 * ("1 short 14:00 – 15:00, 17:00 – 22:00"), else each span with its own ("1
 * short 22:00 – 02:00, 2 short 02:00 – 04:00").
 */
const shortRunsText = (
	spans: ReadonlyArray<RepairShortSpan>,
	t: TFunction
): string => {
	const counts = new Set(spans.map((span) => span.shortBy));
	const runs =
		counts.size === 1
			? [{ count: mostShort(spans), times: spansText(spans, t) }]
			: spans.map((span) => ({
					count: span.shortBy,
					times: spansText([span], t),
				}));
	return runs
		.map((run) => t(`${key}.shortRun`, run))
		.join(t(`${key}.spanSeparator`));
};

/**
 * The toast after applying an option that leaves hours short: "Roster
 * changed. Swing Shift is still 1 short 17:00 – 22:00." Nothing for an option
 * that leaves nothing short, so the toast says only "Roster changed.". Pure.
 */
export const stillShortToast = (
	option: Pick<RepairOption, "stillShort">,
	shift: string,
	t: TFunction
): string | undefined =>
	option.stillShort.length === 0
		? undefined
		: t(`${key}.stillShortToast`, {
				shift,
				runs: shortRunsText(option.stillShort, t),
			});

/** What the panel offers under a refusal: ask the engine again, find the options again at the roster's new revision, or nothing. */
export type RefusalAction = "tryAgain" | "findAgain";

/** Each refusal's one action (UX note 6); none where asking again cannot help. */
export const REFUSAL_ACTIONS: Record<RepairRefusal, RefusalAction | undefined> =
	{
		tooSlow: "tryAgain",
		failed: "tryAgain",
		notConnected: "tryAgain",
		rosterMoved: "findAgain",
		expired: undefined,
		notSeenByEngine: undefined,
	};
