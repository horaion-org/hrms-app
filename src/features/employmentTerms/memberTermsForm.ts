import type { TFunction } from "i18next";
import { z } from "zod";
import type {
	EmploymentTerms,
	HistoryEntry,
	MemberTermsBody,
} from "@/features/employmentTerms/api";
import { hoursInput, parseHours } from "@/features/employmentTerms/hours";
import { isMonday } from "@/features/employmentTerms/termsChanges";

/** The change dialog as it holds its values: own hours as typed text. */
export type MemberTermsFormValues = {
	termsId: string;
	effectiveFrom: string;
	ownWeek: string;
	ownDay: string;
};

/** When a change, or a corrected entry, may start. */
export type StartRule =
	/** Someone's first terms: any day, such as their hire date. */
	| { kind: "anyDay" }
	/** The first entry being corrected: any day while it stays first (before the next entry, if any). */
	| { kind: "first"; before?: string }
	/** A later change: a Monday after the first entry, or the entry's own day when correcting it. */
	| { kind: "monday"; after: string; keep?: string };

/**
 * The API's date rule for one person's terms: their first entry starts on
 * the day they joined (HR may correct it to any day while it stays first;
 * changing a hire date later doesn't move it); every later change starts
 * on a Monday after that first entry. A correction may keep the day it has.
 */
export const startRuleOf = (
	history: ReadonlyArray<HistoryEntry>,
	correcting?: HistoryEntry
): StartRule => {
	const first = history[history.length - 1];
	if (first === undefined) return { kind: "anyDay" };
	if (correcting?.id === first.id) {
		const next = history[history.length - 2];
		return next
			? { kind: "first", before: next.effectiveFrom }
			: { kind: "first" };
	}
	return {
		kind: "monday",
		after: first.effectiveFrom,
		...(correcting ? { keep: correcting.effectiveFrom } : {}),
	};
};

/** Whether a day is allowed under the rule. */
export const allowedStart = (rule: StartRule, date: string): boolean => {
	if (rule.kind === "anyDay") return true;
	if (rule.kind === "first")
		return rule.before === undefined || date < rule.before;
	if (date === rule.keep) return true;
	return date > rule.after && isMonday(date);
};

/** Where the dialog starts: the entry being corrected, or the given terms from `from`. */
export const memberTermsFormValuesOf = (
	start: { termsId: string; effectiveFrom: string } | HistoryEntry
): MemberTermsFormValues => ({
	termsId: start.termsId,
	effectiveFrom: start.effectiveFrom,
	ownWeek:
		"contractedWeekMinutes" in start
			? hoursInput(start.contractedWeekMinutes)
			: "",
	ownDay:
		"contractedDayMinutes" in start
			? hoursInput(start.contractedDayMinutes)
			: "",
});

const minutesOf = (text: string): number | null => {
	const parsed = parseHours(text);
	return parsed.kind === "minutes" ? parsed.minutes : null;
};

/** What the dialog sends; empty own hours follow the terms. */
export const memberTermsBodyOf = (
	values: MemberTermsFormValues
): MemberTermsBody => ({
	employmentTermsId: values.termsId,
	effectiveFrom: values.effectiveFrom,
	contractedWeekMinutes: minutesOf(values.ownWeek),
	contractedDayMinutes: minutesOf(values.ownDay),
});

const key = "employmentTerms.change";

/** Why a day breaks the rule, in the app's words. */
const startProblem = (rule: StartRule, date: string, t: TFunction): string => {
	if (rule.kind === "first") return t(`${key}.firstBeforeNext`);
	if (rule.kind === "monday" && date <= rule.after)
		return t(`${key}.beforeFirst`);
	return t(`${key}.notMonday`);
};

/**
 * Mirrors the API's rules for one person's terms: terms and a start are
 * chosen, a later change starts on a Monday, and their own hours are
 * whole minutes no more than the terms'.
 */
export const memberTermsFormSchema = (
	t: TFunction,
	{
		termsOf,
		startRule,
	}: {
		termsOf: (termsId: string) => EmploymentTerms | undefined;
		startRule: StartRule;
	}
): z.ZodType<MemberTermsFormValues, MemberTermsFormValues> =>
	z
		.object({
			termsId: z.string().min(1, t(`${key}.termsRequired`)),
			effectiveFrom: z.string().min(1, t(`${key}.fromRequired`)),
			ownWeek: z.string(),
			ownDay: z.string(),
		})
		.superRefine((values, context) => {
			const problem = (
				path: keyof MemberTermsFormValues,
				message: string
			): void => {
				context.addIssue({ code: "custom", path: [path], message });
			};
			if (
				values.effectiveFrom !== "" &&
				!allowedStart(startRule, values.effectiveFrom)
			)
				problem(
					"effectiveFrom",
					startProblem(startRule, values.effectiveFrom, t)
				);
			const terms = termsOf(values.termsId);
			const own = (
				field: "ownWeek" | "ownDay",
				ceiling: number | null | undefined
			): void => {
				const parsed = parseHours(values[field]);
				if (parsed.kind === "empty") return;
				if (parsed.kind === "invalid")
					problem(field, t("employmentTerms.dialog.hoursInvalid"));
				else if (parsed.kind === "notWholeMinutes")
					problem(field, t("employmentTerms.dialog.hoursWholeMinutes"));
				else if (parsed.minutes === 0)
					problem(field, t("employmentTerms.dialog.hoursInvalid"));
				else if (
					ceiling !== null &&
					ceiling !== undefined &&
					parsed.minutes > ceiling
				)
					problem(field, t(`${key}.ownAbove`));
			};
			own("ownWeek", terms?.weekMinutes);
			own("ownDay", terms?.dayMinutes);
		});
