import type { TFunction } from "i18next";
import { z } from "zod";
import { isWeekday, type Weekday } from "@/common/weekdays";
import type {
	EmploymentTermsBody,
	ExtraHoursPaidAs,
	WeekFields,
} from "@/features/employmentTerms/api";
import {
	durationShort,
	formatDays,
	hoursInput,
	parseHours,
} from "@/features/employmentTerms/hours";
import {
	percentOfTimes,
	timesOfPercent,
} from "@/features/employmentTerms/rates";

/** The longest name and description terms take, as the API keeps them. */
export const TERMS_NAME_MAX_LENGTH = 100;
export const TERMS_DESCRIPTION_MAX_LENGTH = 500;

/** One extra minute covers rounding, e.g. 5 × 8.8 h against 44 h. */
const ROUNDING_MINUTES = 1;
/** The week's range and the shortest day, as the API's columns check them (no country figure). */
const MIN_WEEK_MINUTES = 60;
const MAX_WEEK_MINUTES = 3600;
const MIN_DAY_MINUTES = 30;
/** A rate's sanity bounds, as the API's columns check them: 0 to 10 times a normal hour (no country figure). */
const MIN_RATE_PERCENT = 0;
const MAX_RATE_PERCENT = 1000;

/** The sanity bounds as messages name them, in times a normal hour. */
export const RATE_BOUNDS_IN_TIMES = {
	min: timesOfPercent(MIN_RATE_PERCENT),
	max: timesOfPercent(MAX_RATE_PERCENT),
};

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
	restKind: "FIXED" | "ROSTERED";
	restWeekday: Weekday | "";
	dailyOvertime: boolean;
	shiftWork: boolean;
	hoursLimitsApply: boolean;
	/** An overtime hour, in times a normal hour as typed ("1.5"). */
	overtimeTimes: string;
	/** Work on the rest day, in times a normal hour. */
	restDayTimes: string;
	/** A day off worked counts as normal hours until the week is passed, or at its own rate. */
	dayOffMode: "NORMAL" | "OWN_RATE";
	dayOffTimes: string;
	/** How extra hours are paid; time off is offered once its balance exists. */
	extraHoursPaidAs: Exclude<ExtraHoursPaidAs, "UNKNOWN">;
};

/** Blank terms: a fixed Sunday rest day and the Act's limits, nothing typed. */
export const BLANK_TERMS: TermsFormValues = {
	name: "",
	description: "",
	daysPerWeek: "",
	dayHours: "",
	weekHours: "",
	restKind: "FIXED",
	restWeekday: "SUN",
	dailyOvertime: true,
	shiftWork: false,
	hoursLimitsApply: true,
	overtimeTimes: "",
	restDayTimes: "",
	dayOffMode: "NORMAL",
	dayOffTimes: "",
	extraHoursPaidAs: "RATE",
};

/** The working days the form offers: "It varies" (null), then ½ to 7 in half days, as the API stores them. */
export const DAYS_CHOICES: ReadonlyArray<number | null> = [
	null,
	...Array.from({ length: 14 }, (_, index) => (index + 1) / 2),
];

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

const percentOrNull = (text: string): number | null => {
	const parsed = percentOfTimes(text);
	return typeof parsed === "number" ? parsed : null;
};

/**
 * Whether the overtime rate is asked: whenever the Act's hour limits apply,
 * and otherwise only for extra hours paid at a rate.
 */
export const overtimeRateAsked = (values: TermsFormValues): boolean =>
	values.hoursLimitsApply || values.extraHoursPaidAs === "RATE";

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
		restDay:
			values.restKind === "ROSTERED"
				? "ROSTERED"
				: (values.restWeekday as Weekday),
		dailyOvertime:
			values.dailyOvertime && !values.shiftWork && dayMinutes !== null,
		shiftWork: values.shiftWork,
		hoursLimitsApply: values.hoursLimitsApply,
		overtimePercent: percentOrNull(values.overtimeTimes),
		restDayWorkPercent: percentOrNull(values.restDayTimes),
		dayOffWorkPercent:
			values.dayOffMode === "OWN_RATE" ? percentOrNull(values.dayOffTimes) : null,
		extraHoursPaidAs: values.extraHoursPaidAs,
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
				restKind: start.restDay === "ROSTERED" ? "ROSTERED" : "FIXED",
				restWeekday: isWeekday(start.restDay) ? start.restDay : "",
				dailyOvertime: start.dailyOvertime,
				shiftWork: start.shiftWork,
				hoursLimitsApply: start.hoursLimitsApply,
				overtimeTimes: timesOrEmpty(start.overtimePercent),
				restDayTimes: timesOrEmpty(start.restDayWorkPercent),
				dayOffMode: start.dayOffWorkPercent === null ? "NORMAL" : "OWN_RATE",
				dayOffTimes: timesOrEmpty(start.dayOffWorkPercent),
				// Time off reads as paid at a rate until the form offers it.
				extraHoursPaidAs:
					start.extraHoursPaidAs === "NOTHING" ? "NOTHING" : "RATE",
			};

/** A stored rate as the field shows it, or empty when the API sent none. */
const timesOrEmpty = (percent: number | null): string =>
	percent === null ? "" : timesOfPercent(percent);

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
	requiredMessage: string
): string | undefined => {
	const parsed = parseHours(text);
	if (parsed.kind === "empty") return required ? requiredMessage : undefined;
	if (parsed.kind === "invalid") return t(`${key}.hoursInvalid`);
	if (parsed.kind === "notWholeMinutes") return t(`${key}.hoursWholeMinutes`);
	if (parsed.minutes < min || (max !== null && parsed.minutes > max))
		return t(`${key}.hoursRange`, {
			min: durationShort(min, t),
			max: durationShort(max ?? MAX_WEEK_MINUTES, t),
		});
	return undefined;
};

/** A typed rate's problem, if any: required, a number such as 1.5, within the sanity bounds. */
const rateProblem = (text: string, t: TFunction): string | undefined => {
	const parsed = percentOfTimes(text);
	if (parsed === "empty" || parsed === "invalid") return t(`${key}.rateInvalid`);
	if (parsed < MIN_RATE_PERCENT || parsed > MAX_RATE_PERCENT)
		return t(`${key}.rateRange`, RATE_BOUNDS_IN_TIMES);
	return undefined;
};

/**
 * Mirrors the API's rules for terms (`EmploymentTermsRules`) so most
 * mistakes show before saving, each as a sentence saying what to change: a
 * name, whole-minute hours in range, a week its working days can hold, a
 * day when overtime counts by the day, a weekday for a fixed rest day, and
 * rates the Employment Act allows. The longest normal day and the lowest
 * overtime rate for covered staff are the country's, so they come from the
 * API (`maxDayMinutes`, `minimumCoveredOvertimePercent`); without them the
 * API alone judges them.
 */
export const termsFormSchema = (
	t: TFunction,
	{
		maxDayMinutes = null,
		minimumCoveredOvertimePercent = null,
	}: {
		maxDayMinutes?: number | null;
		minimumCoveredOvertimePercent?: number | null;
	} = {}
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
			restKind: z.enum(["FIXED", "ROSTERED"]),
			restWeekday: z.union([
				z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
				z.literal(""),
			]),
			dailyOvertime: z.boolean(),
			shiftWork: z.boolean(),
			hoursLimitsApply: z.boolean(),
			overtimeTimes: z.string(),
			restDayTimes: z.string(),
			dayOffMode: z.enum(["NORMAL", "OWN_RATE"]),
			dayOffTimes: z.string(),
			extraHoursPaidAs: z.enum(["RATE", "TIME_OFF", "NOTHING"]),
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
				t(`${key}.dayRequiredForOvertime`)
			);
			if (dayProblem) problem("dayHours", dayProblem);
			const weekProblem = hoursProblem(
				values.weekHours,
				{ required: true, min: MIN_WEEK_MINUTES, max: MAX_WEEK_MINUTES },
				t,
				t(`${key}.hoursRequired`)
			);
			if (weekProblem) problem("weekHours", weekProblem);
			if (values.restKind === "FIXED" && values.restWeekday === "")
				problem("restWeekday", t(`${key}.restDayRequired`));
			const overtimeProblem = overtimeRateAsked(values)
				? rateProblem(values.overtimeTimes, t)
				: undefined;
			if (overtimeProblem) problem("overtimeTimes", overtimeProblem);
			const overtime = percentOfTimes(values.overtimeTimes);
			if (
				values.hoursLimitsApply &&
				minimumCoveredOvertimePercent !== null &&
				typeof overtime === "number" &&
				overtime < minimumCoveredOvertimePercent
			)
				problem(
					"overtimeTimes",
					t(`${key}.rateCovered`, {
						minimum: timesOfPercent(minimumCoveredOvertimePercent),
					})
				);
			if (values.hoursLimitsApply && values.extraHoursPaidAs !== "RATE")
				problem("extraHoursPaidAs", t(`${key}.paidAsCovered`));
			const restDayProblem = rateProblem(values.restDayTimes, t);
			if (restDayProblem) problem("restDayTimes", restDayProblem);
			const dayOffProblem =
				values.dayOffMode === "OWN_RATE"
					? rateProblem(values.dayOffTimes, t)
					: undefined;
			if (dayOffProblem) problem("dayOffTimes", dayOffProblem);
			const days = parseDays(values.daysPerWeek);
			const day = minutesOrNull(values.dayHours);
			const week = minutesOrNull(values.weekHours);
			if (
				typeof days === "number" &&
				day !== null &&
				week !== null &&
				week > days * day + ROUNDING_MINUTES
			)
				problem(
					"weekHours",
					t(`${key}.weekAboveDays`, {
						days: formatDays(days),
						count: days,
						day: durationShort(day, t),
						made: durationShort(Math.round(days * day), t),
						week: durationShort(week, t),
					})
				);
		});
