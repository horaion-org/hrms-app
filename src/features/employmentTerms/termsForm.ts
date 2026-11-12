import type { TFunction } from "i18next";
import { z } from "zod";
import { isWeekday, type Weekday } from "@/common/weekdays";
import type {
	EmploymentTermsBody,
	WeekFields,
} from "@/features/employmentTerms/api";
import {
	formatHours,
	hoursInput,
	parseHours,
} from "@/features/employmentTerms/hours";

/** The longest name and description terms take, as the API keeps them. */
export const TERMS_NAME_MAX_LENGTH = 100;
export const TERMS_DESCRIPTION_MAX_LENGTH = 500;

/** One extra minute covers rounding, e.g. 5 × 8.8 h against 44 h. */
const ROUNDING_MINUTES = 1;
/** The week's range and the shortest day, as the API's columns check them (no country figure). */
const MIN_WEEK_MINUTES = 60;
const MAX_WEEK_MINUTES = 3600;
const MIN_DAY_MINUTES = 30;

/**
 * The terms dialog as it holds its values: numbers as typed text, and the
 * rest day as a kind plus the weekday a fixed one falls on.
 */
export type TermsFormValues = {
	name: string;
	description: string;
	daysPerWeek: string;
	dayHours: string;
	weekHours: string;
	/** Most hours a week, overtime included; empty for no limit. */
	mostWeekHours: string;
	restKind: "FIXED" | "ROSTERED";
	restWeekday: Weekday | "";
	dailyOvertime: boolean;
	shiftWork: boolean;
	hoursLimitsApply: boolean;
};

/** Blank terms: a fixed Sunday rest day and the Act's limits, nothing typed. */
export const BLANK_TERMS: TermsFormValues = {
	name: "",
	description: "",
	daysPerWeek: "",
	dayHours: "",
	weekHours: "",
	mostWeekHours: "",
	restKind: "FIXED",
	restWeekday: "SUN",
	dailyOvertime: true,
	shiftWork: false,
	hoursLimitsApply: true,
};

/** Working days a week: 0.5 to 7, in half days; empty is allowed (part-time). */
export const parseDays = (text: string): number | null | "invalid" => {
	const trimmed = text.trim().replace(",", ".");
	if (trimmed === "") return null;
	const days = Number(trimmed);
	return Number.isFinite(days) &&
		days >= 0.5 &&
		days <= 7 &&
		days * 2 === Math.round(days * 2)
		? days
		: "invalid";
};

const minutesOrNull = (text: string): number | null => {
	const parsed = parseHours(text);
	return parsed.kind === "minutes" ? parsed.minutes : null;
};

/** The form's week as the summary reads it, or nothing while the week is incomplete. */
export const weekFieldsOf = (
	values: TermsFormValues
): WeekFields | undefined => {
	const weekMinutes = minutesOrNull(values.weekHours);
	const days = parseDays(values.daysPerWeek);
	if (weekMinutes === null || weekMinutes === 0 || days === "invalid")
		return undefined;
	if (values.restKind === "FIXED" && !isWeekday(values.restWeekday))
		return undefined;
	const dayMinutes = minutesOrNull(values.dayHours);
	return {
		daysPerWeek: days,
		weekMinutes,
		dayMinutes,
		mostWeekMinutes: minutesOrNull(values.mostWeekHours),
		restDay:
			values.restKind === "ROSTERED"
				? "ROSTERED"
				: (values.restWeekday as Weekday),
		dailyOvertime:
			values.dailyOvertime && !values.shiftWork && dayMinutes !== null,
		shiftWork: values.shiftWork,
		hoursLimitsApply: values.hoursLimitsApply,
	};
};

/** The form as stored terms: what is sent once the schema passes. */
export const termsBodyOf = (values: TermsFormValues): EmploymentTermsBody => {
	const fields = weekFieldsOf(values);
	if (!fields) throw new Error("termsBodyOf: the form did not pass its schema");
	return {
		...fields,
		name: values.name.trim(),
		description: values.description.trim() || null,
	};
};

/** Where the form starts from: terms being edited, a preset, or blank. */
export const termsFormValuesOf = (
	start:
		(WeekFields & { name: string; description?: string | null }) | undefined
): TermsFormValues =>
	start === undefined
		? BLANK_TERMS
		: {
				name: start.name,
				description: start.description ?? "",
				daysPerWeek:
					start.daysPerWeek === null ? "" : String(start.daysPerWeek),
				dayHours: hoursInput(start.dayMinutes),
				weekHours: hoursInput(start.weekMinutes),
				mostWeekHours: hoursInput(start.mostWeekMinutes),
				restKind: start.restDay === "ROSTERED" ? "ROSTERED" : "FIXED",
				restWeekday: isWeekday(start.restDay) ? start.restDay : "",
				dailyOvertime: start.dailyOvertime,
				shiftWork: start.shiftWork,
				hoursLimitsApply: start.hoursLimitsApply,
			};

const key = "employmentTerms.dialog";

/** A typed hours field's problem, if any; `required` makes empty a problem. */
const hoursProblem = (
	text: string,
	{
		required,
		min,
		max,
	}: { required: boolean; min: number; max: number | null },
	t: TFunction,
	language: string
): string | undefined => {
	const parsed = parseHours(text);
	if (parsed.kind === "empty")
		return required ? t(`${key}.hoursRequired`) : undefined;
	if (parsed.kind === "invalid") return t(`${key}.hoursInvalid`);
	if (parsed.kind === "notWholeMinutes") return t(`${key}.hoursWholeMinutes`);
	if (parsed.minutes < min || (max !== null && parsed.minutes > max))
		return t(`${key}.hoursRange`, {
			min: formatHours(min, language),
			max: formatHours(max ?? MAX_WEEK_MINUTES, language),
		});
	return undefined;
};

/**
 * Mirrors the API's rules for terms (`EmploymentTermsRules`) so most
 * mistakes show before saving: a name, whole-minute hours in range, a week
 * no longer than its days × its day, a day when overtime counts by the day,
 * most hours a week not below the week, and a weekday for a fixed rest day. The longest normal day is the
 * country's, so it comes from the API (`maxDayMinutes`); without it the API
 * alone judges it.
 */
export const termsFormSchema = (
	t: TFunction,
	{
		maxDayMinutes = null,
		language = "en",
	}: { maxDayMinutes?: number | null; language?: string } = {}
): z.ZodType<TermsFormValues, TermsFormValues> =>
	z
		.object({
			name: z
				.string()
				.trim()
				.min(1, t(`${key}.nameRequired`))
				.max(TERMS_NAME_MAX_LENGTH, t(`${key}.nameLength`)),
			description: z
				.string()
				.trim()
				.max(TERMS_DESCRIPTION_MAX_LENGTH, t(`${key}.descriptionLength`)),
			daysPerWeek: z.string(),
			dayHours: z.string(),
			weekHours: z.string(),
			mostWeekHours: z.string(),
			restKind: z.enum(["FIXED", "ROSTERED"]),
			restWeekday: z.union([
				z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
				z.literal(""),
			]),
			dailyOvertime: z.boolean(),
			shiftWork: z.boolean(),
			hoursLimitsApply: z.boolean(),
		})
		.superRefine((values, context) => {
			const problem = (path: keyof TermsFormValues, message: string): void => {
				context.addIssue({ code: "custom", path: [path], message });
			};
			if (parseDays(values.daysPerWeek) === "invalid")
				problem("daysPerWeek", t(`${key}.daysInvalid`));
			const dayRequired = values.dailyOvertime && !values.shiftWork;
			const dayProblem = hoursProblem(
				values.dayHours,
				{ required: dayRequired, min: MIN_DAY_MINUTES, max: maxDayMinutes },
				t,
				language
			);
			if (dayProblem) problem("dayHours", dayProblem);
			const weekProblem = hoursProblem(
				values.weekHours,
				{ required: true, min: MIN_WEEK_MINUTES, max: MAX_WEEK_MINUTES },
				t,
				language
			);
			if (weekProblem) problem("weekHours", weekProblem);
			const mostWeekProblem = hoursProblem(
				values.mostWeekHours,
				{ required: false, min: 0, max: null },
				t,
				language
			);
			if (mostWeekProblem) problem("mostWeekHours", mostWeekProblem);
			if (values.restKind === "FIXED" && values.restWeekday === "")
				problem("restWeekday", t(`${key}.restDayRequired`));
			const days = parseDays(values.daysPerWeek);
			const day = minutesOrNull(values.dayHours);
			const week = minutesOrNull(values.weekHours);
			if (
				typeof days === "number" &&
				day !== null &&
				week !== null &&
				week > days * day + ROUNDING_MINUTES
			)
				problem("weekHours", t(`${key}.weekAboveDays`));
			const mostWeek = minutesOrNull(values.mostWeekHours);
			if (mostWeek !== null && week !== null && mostWeek < week)
				problem("mostWeekHours", t(`${key}.mostBelowWeek`));
		});
