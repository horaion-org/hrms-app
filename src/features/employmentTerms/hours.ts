import type { TFunction } from "i18next";

/*
 * Hours as people type and read them, minutes as the API keeps them. Only
 * whole minutes travel. People see hours and minutes ("8 h 48 min", or
 * "8:48" in a field), never a decimal hour such as 8.8.
 */

const MINUTES_PER_HOUR = 60;
/**
 * How far from a whole minute typed decimal hours may land and still read as
 * it, so a typed 8.3333 still means 500 minutes.
 */
const TOLERANCE = 0.01;
/** The glyph a half day is written with: 5½ days. */
const HALF = "½";

/** What typed hours turned out to be. */
export type ParsedHours =
	| { kind: "empty" }
	| { kind: "invalid" }
	| { kind: "notWholeMinutes" }
	| { kind: "minutes"; minutes: number };

/** "8:48", "8h48", "8 h 48 min" or "8h": hours, then optional minutes under 60. */
const HOURS_AND_MINUTES = /^(\d+)\s*(?::|h)\s*(?:(\d{1,2})\s*(?:m|min)?)?$/i;
/** "44", "8.8" or "7,5": decimal hours, as people also type them. */
const DECIMAL_HOURS = /^\d+(\.\d+)?$/;

/** Reads typed hours: "44", "8:48", "8h48", "8 h 48 min", or decimals such as "8.8" and "7,5". */
export const parseHours = (text: string): ParsedHours => {
	const trimmed = text.trim().toLowerCase();
	if (trimmed === "") return { kind: "empty" };
	const clock = HOURS_AND_MINUTES.exec(trimmed);
	if (clock) {
		const minutes = Number(clock[2] ?? 0);
		if (minutes >= MINUTES_PER_HOUR) return { kind: "invalid" };
		return {
			kind: "minutes",
			minutes: Number(clock[1]) * MINUTES_PER_HOUR + minutes,
		};
	}
	const decimal = trimmed.replace(",", ".");
	if (!DECIMAL_HOURS.test(decimal)) return { kind: "invalid" };
	const minutes = Number(decimal) * MINUTES_PER_HOUR;
	const whole = Math.round(minutes);
	if (Math.abs(minutes - whole) > TOLERANCE) return { kind: "notWholeMinutes" };
	return { kind: "minutes", minutes: whole };
};

/** Minutes as an hours field shows them: "44", "8:48", or "" for none. */
export const hoursInput = (minutes: number | null): string => {
	if (minutes === null) return "";
	const hours = Math.floor(minutes / MINUTES_PER_HOUR);
	const rest = minutes % MINUTES_PER_HOUR;
	return rest === 0
		? String(hours)
		: `${hours}:${String(rest).padStart(2, "0")}`;
};

/** Hours and minutes of a duration, each counted once. */
const split = (minutes: number): { hours: number; rest: number } => ({
	hours: Math.floor(minutes / MINUTES_PER_HOUR),
	rest: minutes % MINUTES_PER_HOUR,
});

/** A duration in words, for sentences: "44 hours", "8 hours 48 minutes", "30 minutes". */
export const durationLong = (minutes: number, t: TFunction): string => {
	const { hours, rest } = split(minutes);
	const parts = [
		...(hours > 0
			? [t("employmentTerms.duration.long.hours", { count: hours })]
			: []),
		...(rest > 0 || hours === 0
			? [t("employmentTerms.duration.long.minutes", { count: rest })]
			: []),
	];
	return parts.join(" ");
};

/** A duration in short, for lists and hints: "44 h", "8 h 48 min", "30 min". */
export const durationShort = (minutes: number, t: TFunction): string => {
	const { hours, rest } = split(minutes);
	const parts = [
		...(hours > 0
			? [t("employmentTerms.duration.short.hours", { count: hours })]
			: []),
		...(rest > 0 || hours === 0
			? [t("employmentTerms.duration.short.minutes", { count: rest })]
			: []),
	];
	return parts.join(" ");
};

/** Working days as people write them: "5", "5½", "½". */
export const formatDays = (days: number): string => {
	const whole = Math.floor(days);
	const half = days - whole >= 0.5;
	if (!half) return String(whole);
	return whole === 0 ? HALF : `${whole}${HALF}`;
};
