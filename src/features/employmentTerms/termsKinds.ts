import type { TFunction } from "i18next";
import type {
	TermsPreset,
	TermsReference,
} from "@/features/employmentTerms/api";
import {
	durationShort,
	formatDays,
	parseHours,
} from "@/features/employmentTerms/hours";
import { isPartTimeWeek } from "@/features/employmentTerms/summary";
import {
	parseDays,
	termsFormValuesOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";

/** The kinds of week the form starts from, in the order it offers them. */
export const TERMS_KINDS = [
	"FIVE_DAYS",
	"FIVE_AND_HALF_DAYS",
	"SHIFT_WORK",
	"PART_TIME",
] as const;

/** A kind the form offers, or CUSTOM when the fields match none of them. */
export type TermsKind = (typeof TERMS_KINDS)[number] | "CUSTOM";

/** Which of the API's presets fills each kind; the figures live in the API, never here. */
export const PRESET_KEY_OF_KIND: Record<(typeof TERMS_KINDS)[number], string> =
	{
		FIVE_DAYS: "FIVE_DAY",
		FIVE_AND_HALF_DAYS: "FIVE_AND_HALF_DAY",
		SHIFT_WORK: "SIX_DAY_SHIFT",
		PART_TIME: "PART_TIME",
	};

/** The API's preset for a kind, if it serves one. */
export const presetOfKind = (
	kind: (typeof TERMS_KINDS)[number],
	presets: ReadonlyArray<TermsPreset>
): TermsPreset | undefined =>
	presets.find((preset) => preset.key === PRESET_KEY_OF_KIND[kind]);

/** The fixed-hours kinds, told apart by their presets' working days. */
const FIXED_KINDS = ["FIVE_DAYS", "FIVE_AND_HALF_DAYS"] as const;

/**
 * Which kind the form's fields are, so editing opens on its kind and the
 * cards follow every change: shift work first, then part-time (below the
 * API's line), then a fixed week whose days match a preset's; anything
 * else is CUSTOM. Every figure comes from the API's presets and line.
 */
export const kindOf = (
	values: Pick<TermsFormValues, "shiftWork" | "weekHours" | "daysPerWeek">,
	presets: ReadonlyArray<TermsPreset>,
	partTimeBelowMinutes: number | null
): TermsKind => {
	if (values.shiftWork) return "SHIFT_WORK";
	const week = parseHours(values.weekHours);
	if (
		week.kind === "minutes" &&
		isPartTimeWeek(week.minutes, partTimeBelowMinutes)
	)
		return "PART_TIME";
	const days = parseDays(values.daysPerWeek);
	const fixed = FIXED_KINDS.find(
		(kind) =>
			typeof days === "number" &&
			presetOfKind(kind, presets)?.daysPerWeek === days
	);
	return fixed ?? "CUSTOM";
};

/**
 * The form once a kind is chosen: the preset's week, keeping what the kind
 * does not decide (the name, the description, whether the Act's hour limits
 * apply and the pay). New terms, with no pay typed yet, take the preset's
 * pay, so they start at the country's usual rates.
 */
export const valuesForKind = (
	preset: TermsPreset,
	current: TermsFormValues
): TermsFormValues => {
	const fromPreset = termsFormValuesOf(preset);
	const payTyped = current.overtimeTimes !== "" || current.restDayTimes !== "";
	return {
		...fromPreset,
		name: current.name,
		description: current.description,
		hoursLimitsApply: current.hoursLimitsApply,
		...(payTyped
			? {
					overtimeTimes: current.overtimeTimes,
					restDayTimes: current.restDayTimes,
					dayOffMode: current.dayOffMode,
					dayOffTimes: current.dayOffTimes,
					extraHoursPaidAs: current.extraHoursPaidAs,
				}
			: {}),
	};
};

/**
 * A kind's card line, from its preset's figures and the API's part-time
 * line: "44 h over 5 days, rest day Sunday", "Shifts of up to 12 h; the
 * roster picks the rest day", "Under 35 h a week". Undefined without a
 * preset, so a card never states a figure the product does not hold.
 */
export const kindDescription = (
	kind: (typeof TERMS_KINDS)[number],
	preset: TermsPreset | undefined,
	reference: TermsReference | undefined,
	t: TFunction
): string | undefined => {
	const key = "employmentTerms.kinds";
	if (kind === "PART_TIME")
		return reference?.partTimeBelowMinutes === null || reference === undefined
			? undefined
			: t(`${key}.partTimeDescription`, {
					line: durationShort(reference.partTimeBelowMinutes, t),
				});
	if (!preset) return undefined;
	if (kind === "SHIFT_WORK")
		return preset.dayMinutes === null
			? undefined
			: t(`${key}.shiftWorkDescription`, {
					day: durationShort(preset.dayMinutes, t),
				});
	const rest =
		preset.restDay === "ROSTERED" || preset.restDay === "UNKNOWN"
			? t(`${key}.restOnRoster`)
			: t(`${key}.restOn`, { weekday: t(`weekdays.${preset.restDay}`) });
	return t(`${key}.fixedDescription`, {
		week: durationShort(preset.weekMinutes, t),
		rest,
	});
};

/**
 * A kind's card title: "Fixed hours, 5 days" with the days of its preset,
 * "Shift work", "Part-time", or "Your own week" for CUSTOM.
 */
export const kindLabel = (
	kind: TermsKind,
	preset: TermsPreset | undefined,
	t: TFunction
): string => {
	const key = "employmentTerms.kinds";
	if (kind === "FIVE_DAYS" || kind === "FIVE_AND_HALF_DAYS")
		return preset?.daysPerWeek === null || preset === undefined
			? t(`${key}.fixed`)
			: t(`${key}.fixedDays`, {
					days: formatDays(preset.daysPerWeek),
					count: preset.daysPerWeek,
				});
	return t(`${key}.${kind}`);
};
