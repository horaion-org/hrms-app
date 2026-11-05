/*
 * Hours as people type and read them, minutes as the API keeps them. Only
 * whole minutes travel, so 8.8 h (528 min) is a value and 8.33 h is not.
 */

const MINUTES_PER_HOUR = 60;
/**
 * How far from a whole minute typed hours may land and still read as it: a
 * figure the API stored (500 min) shows as "8.3333" and must save unchanged.
 */
const TOLERANCE = 0.01;

/** What typed hours turned out to be. */
export type ParsedHours =
	| { kind: "empty" }
	| { kind: "invalid" }
	| { kind: "notWholeMinutes" }
	| { kind: "minutes"; minutes: number };

/** Reads typed hours ("44", "8.8", "7.5"); a comma is read as the decimal point. */
export const parseHours = (text: string): ParsedHours => {
	const trimmed = text.trim().replace(",", ".");
	if (trimmed === "") return { kind: "empty" };
	if (!/^\d+(\.\d+)?$/.test(trimmed)) return { kind: "invalid" };
	const minutes = Number(trimmed) * MINUTES_PER_HOUR;
	const whole = Math.round(minutes);
	if (Math.abs(minutes - whole) > TOLERANCE) return { kind: "notWholeMinutes" };
	return { kind: "minutes", minutes: whole };
};

/** Minutes as a field shows them: "44", "8.8", or "" for none. */
export const hoursInput = (minutes: number | null): string =>
	minutes === null
		? ""
		: String(Number((minutes / MINUTES_PER_HOUR).toFixed(4)));

/** Minutes as hours in the reader's language, up to two decimals: "8.8", "44". */
export const formatHours = (minutes: number, language: string): string =>
	new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(
		minutes / MINUTES_PER_HOUR
	);

/** Working days as the reader's language writes them: "5", "5.5". */
export const formatDays = (days: number, language: string): string =>
	new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(days);
