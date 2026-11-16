import type { TFunction } from "i18next";
import type { TermsReference } from "@/features/employmentTerms/api";
import { termsSentence } from "@/features/employmentTerms/summary";
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
	"weekHours",
	"dayHours",
	"daysPerWeek",
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
		const names = missing.map((field) =>
			t(
				field === "dayHours" && values.shiftWork
					? `${key}.fields.longestShift`
					: `${key}.fields.${field}`
			)
		);
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
