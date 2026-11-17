import type { TFunction } from "i18next";

/*
 * Rates as people type and read them ("1.5 times a normal hour"), whole
 * percentages as the API keeps them (150). Only whole percentages travel, so
 * a rate has at most two decimals.
 */

const PERCENT_PER_TIMES = 100;
/** "1.5", "2", "1,25" or ".5": a decimal number, as people type a rate. */
const DECIMAL_TIMES = /^(\d+)?([.,]\d+)?$/;
/** How far from a whole percentage typed times may land and still read as it. */
const TOLERANCE = 0.000001;

/** What a typed rate turned out to be. */
export type ParsedRate = number | "empty" | "invalid";

/** A whole percentage as times, without trailing zeros: 150 as "1.5", 200 as "2". */
export const timesOfPercent = (percent: number): string =>
	String(percent / PERCENT_PER_TIMES);

/** Reads a typed rate in times ("1.5" or "1,5") as a whole percentage, or why it cannot. */
export const percentOfTimes = (text: string): ParsedRate => {
	const trimmed = text.trim();
	if (trimmed === "") return "empty";
	if (!DECIMAL_TIMES.test(trimmed)) return "invalid";
	const percent = Number(trimmed.replace(",", ".")) * PERCENT_PER_TIMES;
	const whole = Math.round(percent);
	if (!Number.isFinite(percent) || Math.abs(percent - whole) > TOLERANCE)
		return "invalid";
	return whole;
};

/** A rate in words, for sentences and hints: "1.5 times". */
export const formatTimes = (percent: number, t: TFunction): string =>
	t("employmentTerms.rates.times", { times: timesOfPercent(percent) });
