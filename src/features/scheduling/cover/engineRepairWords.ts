import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { stretchOvertimeText } from "@/features/scheduling/shifts/stretchWords";
import type {
	RepairMove,
	RepairOption,
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

/** The refusals a second ask may mend: the engine failed, or took too long this time. */
export const RETRYABLE_REPAIR_REFUSALS: ReadonlyArray<RepairRefusal> = [
	"tooSlow",
	"failed",
];

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

/** Feasible options first, each group in the engine's order. */
export const optionsInOrder = (
	options: ReadonlyArray<RepairOption>
): Array<RepairOption> => [
	...options.filter((option) => option.feasible),
	...options.filter((option) => !option.feasible),
];

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
 * What to do about the hours an option offered still leaves short: "After
 * applying it, find cover again for the hours still short."; nothing when it
 * fills the gap or cannot be applied.
 */
export const leftShortNextLine = (
	option: RepairOption,
	t: TFunction
): string | undefined =>
	option.feasible && option.leftShort.length > 0
		? t(`${key}.leftShortNext`)
		: undefined;

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

/** What an option still leaves short: "Still 1 short 07:00 – 09:00"; nothing when it fills the gap. */
export const leftShortLine = (
	option: RepairOption,
	t: TFunction
): string | undefined => {
	if (option.leftShort.length === 0) return undefined;
	return t(`${key}.leftShort`, {
		count: option.leftShortBy ?? 1,
		times: option.leftShort.map((span) => spanText(span, t)).join(", "),
	});
};
