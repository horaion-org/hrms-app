import type { TFunction } from "i18next";
import type {
	TermsReference,
	WeekFields,
} from "@/features/employmentTerms/api";
import { durationShort } from "@/features/employmentTerms/hours";
import { formatTimes } from "@/features/employmentTerms/rates";
import {
	paidAtARate,
	partTimeOf,
	termsSentence,
} from "@/features/employmentTerms/summary";
import {
	termsFormSchema,
	weekFieldsOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";

/** What the form's terms mean, or, while a week field is unfinished, what to fill in or fix. */
export type ReadBack =
	{ complete: true; text: string } | { complete: false; text: string };

/** The fields the sentence is built from, in the order the form shows them. */
const WEEK_FIELDS = [
	"daysPerWeek",
	"weekHours",
	"restWeekday",
] as const satisfies ReadonlyArray<keyof TermsFormValues>;

type WeekField = (typeof WEEK_FIELDS)[number];

/**
 * The read-back the form pins above its fields. It is never a wrong
 * sentence: while any week field is empty or invalid it names those fields
 * instead (the name and description never stop it). The checks are the
 * form's own schema, so the read-back and the field errors agree.
 */
export const readBackOf = (
	values: TermsFormValues,
	reference: TermsReference | undefined,
	t: TFunction,
	language: string
): ReadBack => {
	const key = "employmentTerms.readBack";
	const result = termsFormSchema(t, {
		maxDayMinutes: reference?.maxNormalDayMinutes ?? null,
	}).safeParse(values);
	const unfinished = result.success
		? []
		: WEEK_FIELDS.filter((field) =>
				result.error.issues.some((issue) => issue.path[0] === field)
			);
	const fields = weekFieldsOf(values);
	if (unfinished.length > 0 || !fields) {
		// A week the schema accepts but can't read is still missing its hours.
		const missing: Array<WeekField> =
			unfinished.length > 0 ? unfinished : ["weekHours"];
		const names = missing.map((field) => t(`${key}.fields.${field}`));
		return {
			complete: false,
			text: t(`${key}.unfinished`, {
				fields: new Intl.ListFormat(language, { type: "conjunction" }).format(
					names
				),
			}),
		};
	}
	return { complete: true, text: termsSentence(fields, reference, t) };
};

/** The extra hours the examples work: four past the week, one past the day (an illustration, not a figure of law). */
const EXAMPLE_EXTRA_WEEK_MINUTES = 240;
const EXAMPLE_EXTRA_DAY_MINUTES = 60;

const exampleKey = "employmentTerms.readBack.example";

/**
 * The sample week's example, in figures: a long week (or day, with daily
 * overtime) and how it splits. A part-timer's extra hours are at the normal
 * rate. When the roster picks the rest day, it says the drawn day is only an
 * example. Nothing without the API's figures.
 */
export const termsExample = (
	fields: WeekFields,
	reference: TermsReference | undefined,
	t: TFunction
): string | undefined => {
	if (reference === undefined) return undefined;
	const short = (minutes: number): string => durationShort(minutes, t);
	const times =
		paidAtARate(fields) && fields.overtimePercent !== null
			? formatTimes(fields.overtimePercent, t)
			: undefined;
	const partTime = partTimeOf(fields, reference);
	const daily = fields.dailyOvertime && fields.dayMinutes !== null;
	const dayMinutes = fields.dayMinutes ?? 0;
	const dayValues = {
		worked: short(dayMinutes + EXAMPLE_EXTRA_DAY_MINUTES),
		day: short(dayMinutes),
		extra: short(EXAMPLE_EXTRA_DAY_MINUTES),
	};
	const weekValues = {
		worked: short(fields.weekMinutes + EXAMPLE_EXTRA_WEEK_MINUTES),
		week: short(fields.weekMinutes),
		extra: short(EXAMPLE_EXTRA_WEEK_MINUTES),
	};
	const splitOf = (): string => {
		if (partTime) return t(`${exampleKey}.partTime`, weekValues);
		if (daily)
			return times === undefined
				? t(`${exampleKey}.day`, dayValues)
				: t(`${exampleKey}.dayAt`, { ...dayValues, times });
		return times === undefined
			? t(`${exampleKey}.week`, weekValues)
			: t(`${exampleKey}.weekAt`, { ...weekValues, times });
	};
	const example = splitOf();
	const restIsExample =
		!partTime && fields.restDay === "ROSTERED" && fields.daysPerWeek !== null;
	return restIsExample
		? `${example} ${t(`${exampleKey}.restIsExample`)}`
		: example;
};

const effectsKey = "employmentTerms.readBack.does";

/**
 * "What this changes": the hours ledger, the roster's limits, the rest day,
 * and how the engine weighs extra hours. The limits are the Work policy's,
 * named without figures (the dialog does not read the policy).
 */
export const termsEffects = (
	fields: WeekFields,
	reference: TermsReference | undefined,
	t: TFunction
): Array<string> => {
	const partTime = partTimeOf(fields, reference);
	const daily = fields.dailyOvertime && fields.dayMinutes !== null;
	const rest = partTime
		? t(`${effectsKey}.restPartTime`)
		: fields.restDay === "ROSTERED" || fields.restDay === "UNKNOWN"
			? t(`${effectsKey}.restRostered`)
			: t(`${effectsKey}.restFixed`, {
					weekday: t(`weekdays.${fields.restDay}`),
				});
	return [
		t(daily ? `${effectsKey}.hoursDayAndWeek` : `${effectsKey}.hoursWeek`),
		t(
			fields.hoursLimitsApply
				? `${effectsKey}.limitsApply`
				: `${effectsKey}.limitsDontApply`
		),
		rest,
		paidAtARate(fields) && fields.overtimePercent !== null
			? t(`${effectsKey}.costAt`, {
					times: formatTimes(fields.overtimePercent, t),
				})
			: t(`${effectsKey}.costSame`),
	];
};
