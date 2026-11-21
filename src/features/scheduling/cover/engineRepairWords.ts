import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { dayTypeInSentence } from "@/features/scheduling/dayTypes";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";
import type { RosterCellValue } from "@/features/scheduling/schedules/api";
import { hoursFromMinutes } from "@/features/scheduling/shifts/shiftHours";
import { stretchOvertimeText } from "@/features/scheduling/shifts/stretchWords";
import type {
	RepairMove,
	RepairOption,
	RepairPerson,
	RepairShortSpan,
	RepairSpan,
} from "@/features/scheduling/cover/engineRepairApi";

/*
 * The engine's repair options in the app's words, pure: the API sends kinds,
 * names, days and minutes, and the app writes every line (ADR-0003). The
 * engine's own sentences (summary, reason) are quoted elsewhere, never
 * rewritten here.
 */

const key = "scheduling.cover.engine";

/** Where a local date-time's clock time starts and ends: `yyyy-MM-ddTHH:mm…` → `HH:mm`. */
const CLOCK_TIME_START = 11;
const CLOCK_TIME_END = 16;

/** How the section names people, days and hours. */
export type RepairNames = {
	/** A member's name by membership id. */
	member: (membershipId: string) => string;
	/** A day, e.g. "Tue, 10 Nov". */
	day: (isoDate: string) => string;
	/** Minutes as hours, one decimal at most: 90 → "1.5". */
	hours: (minutes: number) => string;
};

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

/** What a failed ask means; anything not named reads as the engine failing, which a retry may mend. */
export const repairRefusalOf = (error: unknown): RepairRefusal =>
	(error instanceof ApiProblemError && error.errorCode
		? REFUSALS[error.errorCode]
		: undefined) ?? "failed";

/** A local date-time's clock time: "2026-11-10T07:00:00" → "07:00"; empty when unknown. */
export const clockTime = (dateTime: string | null): string =>
	dateTime === null ? "" : dateTime.slice(CLOCK_TIME_START, CLOCK_TIME_END);

/** The person a move is about, as the roster names them, else as someone who left. */
const personOf = (move: RepairMove, names: RepairNames, t: TFunction): string =>
	move.displayName ??
	(move.membershipId === null
		? t("scheduling.detail.formerMember")
		: names.member(move.membershipId));

/**
 * A stretch in plain words, by its side: "Chen Wei stays on after Swing Shift
 * · +2 h overtime, until 15:00", "… starts Swing Shift early · +2 h overtime,
 * from 11:00"; without a side, "Extend Chen Wei's Swing Shift · +2 h overtime".
 */
const stretchLine = (
	move: RepairMove,
	values: { name: string; shift: string; day: string },
	t: TFunction
): string => {
	const overtime = stretchOvertimeText(move.extensionMinutes ?? 0, t);
	if (move.side === "AFTER_SHIFT")
		return t(`${key}.move.OVERTIME_EXTENSION_AFTER`, {
			...values,
			overtime,
			time: clockTime(move.period.end),
		});
	if (move.side === "BEFORE_SHIFT")
		return t(`${key}.move.OVERTIME_EXTENSION_BEFORE`, {
			...values,
			overtime,
			time: clockTime(move.period.start),
		});
	return t(`${key}.move.OVERTIME_EXTENSION`, { ...values, overtime });
};

/**
 * One move in plain words: "Move Lina Tan from Evening Tue, 10 Nov to Morning
 * Tue, 10 Nov", "Call in Ari Lim for Morning Tue, 10 Nov", "Extend Omar
 * Aziz's Night · +2 h overtime".
 */
export const moveLine = (
	move: RepairMove,
	names: RepairNames,
	t: TFunction
): string => {
	const values = {
		name: personOf(move, names, t),
		shift: move.shiftName ?? t(`${key}.unknownShift`),
		day: move.date === null ? "" : names.day(move.date),
	};
	switch (move.kind) {
		case "REASSIGN":
			return t(`${key}.move.REASSIGN`, {
				...values,
				fromShift: move.fromShiftName ?? t(`${key}.unknownShift`),
				fromDay: move.fromDate === null ? "" : names.day(move.fromDate),
			});
		case "CALL_IN":
			return t(`${key}.move.CALL_IN`, values);
		case "OVERTIME_EXTENSION":
			return stretchLine(move, values, t);
		default:
			return t(`${key}.move.UNKNOWN`);
	}
};

/** A span as clock times: "07:00 – 09:00". */
const spanText = (span: RepairSpan, t: TFunction): string =>
	t("scheduling.timeRange", {
		start: clockTime(span.start),
		end: clockTime(span.end),
	});

/**
 * An option's heading: "Fills the gap", "Fills part of the gap" when it
 * leaves some hours short (a stretch often does, the engine's ADR-0036), or
 * "Can’t fill the gap" for the engine's honest no. Pure.
 */
export const optionHeadingKey = (
	option: RepairOption
): "fills" | "fillsPart" | "cannotFill" => {
	if (!option.feasible) return "cannotFill";
	return option.leftShort.length > 0 ? "fillsPart" : "fills";
};

/**
 * The toast after applying an option that leaves hours short, which closes
 * Find cover: "Roster changed. Night on Tue, 24 Nov is still 1 short 23:00 –
 * 07:00: find cover again for those hours." Nothing for an option that fills
 * the gap, so the toast says only "Roster changed.".
 */
export const stillShortAfterApplying = (
	option: RepairOption,
	gap: { shift: string; day: string },
	t: TFunction
): string | undefined => {
	if (!option.feasible || option.leftShort.length === 0) return undefined;
	return t(`${key}.appliedStillShort`, {
		count: option.leftShortBy ?? 1,
		shift: gap.shift,
		day: gap.day,
		times: option.leftShort.map((span) => spanText(span, t)).join(", "),
	});
};

/** What the words of an option read from the roster: a day as it stands now, and a day's weekday. */
export type OptionWordSources = {
	/** What a changed day holds on the roster now; undefined for a day the roster does not hold. */
	dayBefore: (cell: RosterChangeCell) => RosterCellValue | undefined;
	/** A day's weekday in words, e.g. "Saturday". */
	weekday: (isoDate: string) => string;
};

/** A stretch in a manager's words, by the side its cell stretches: "Stays on 2 h", "Starts 2 h early". */
const stretchKindLine = (cell: RosterChangeCell, t: TFunction): string => {
	const after = cell.kind === "WORK" ? (cell.stretchAfterMinutes ?? 0) : 0;
	const before = cell.kind === "WORK" ? (cell.stretchBeforeMinutes ?? 0) : 0;
	return after > 0
		? t(`${key}.kindLine.stretchAfter`, { hours: hoursFromMinutes(after) })
		: t(`${key}.kindLine.stretchBefore`, { hours: hoursFromMinutes(before) });
};

/**
 * What an option is, in one short line by its kind (UX note 2.2): "Comes in
 * on a day off", "Moves from Lunch Rush", "Stays on 2 h", "Cover it between
 * them", "Works Saturday instead of Friday", "2 changes". The first cell is
 * the day taken; a day swap's OFF cell is the day given up. Pure.
 */
export const optionKindLine = (
	option: Pick<RepairOption, "kind" | "cells">,
	{ dayBefore, weekday }: OptionWordSources,
	t: TFunction
): string => {
	const [taken] = option.cells;
	const before = taken && dayBefore(taken);
	switch (option.kind) {
		case "CALL_IN":
			return t(`${key}.kindLine.callIn`, {
				dayType: dayTypeInSentence(before?.dayType ?? null, t),
			});
		case "MOVE":
			return t(`${key}.kindLine.move`, {
				shift: before?.shift?.name ?? t(`${key}.unknownShift`),
			});
		case "OVERTIME_STRETCH":
			return taken
				? stretchKindLine(taken, t)
				: t(`${key}.kindLine.stretchPair`);
		case "STRETCH_PAIR":
			return t(`${key}.kindLine.stretchPair`);
		case "DAY_SWAP": {
			const givenUp = option.cells.find((cell) => cell.kind === "OFF");
			return t(`${key}.kindLine.daySwap`, {
				day: taken ? weekday(taken.day) : "",
				dayGivenUp: givenUp ? weekday(givenUp.day) : "",
			});
		}
		default:
			return t(`${key}.kindLine.other`, { count: option.cells.length });
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
 * several, n being the most `shortNow` has short (else one more than it
 * leaves); "Still short 09:00 – 11:00" for some hours. Pure.
 */
export const whatItLeaves = (
	option: Pick<RepairOption, "fills" | "stillShort">,
	shortNow: ReadonlyArray<RepairShortSpan> | null,
	t: TFunction
): WhatItLeaves | undefined => {
	if (option.fills === "ONE_PERSON")
		return {
			kind: "onePerson",
			text: t(`${key}.leaves.onePerson`, {
				count: shortNow
					? mostShort(shortNow)
					: mostShort(option.stillShort) + 1,
			}),
		};
	if (option.fills === "PART")
		return {
			kind: "part",
			text: t(`${key}.leaves.stillShort`, {
				times: spansText(option.stillShort, t),
			}),
		};
	return undefined;
};

/** Spans as clock times, joined: "09:00 – 11:00, 14:00 – 15:00". */
export const spansText = (
	spans: ReadonlyArray<RepairSpan>,
	t: TFunction
): string => spans.map((span) => spanText(span, t)).join(", ");

/** A person's week before and after an option, in hours: "30 → 36 h of 44 h this week". */
export const weekLine = (
	weekMinutes: NonNullable<RepairPerson["weekMinutes"]>,
	t: TFunction
): string =>
	t(`${key}.weekLine`, {
		before: hoursFromMinutes(weekMinutes.before),
		after: hoursFromMinutes(weekMinutes.after),
		contract: hoursFromMinutes(weekMinutes.contract),
	});

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
				count: mostShort(option.stillShort),
				shift,
				times: spansText(option.stillShort, t),
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
