import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	CONSTRAINT_REQUIREMENTS,
	CONSTRAINT_STATUSES,
	CONSTRAINT_TYPES,
	type ConstraintBody,
	type ConstraintField,
	type ConstraintFieldSpec,
	type ConstraintStatus,
	type ConstraintTypeOption,
} from "@/features/scheduling/constraints/api";

/** Each field's values as the form holds them: as text, a field of one value as a list of one. */
export type ConstraintFieldValues = Partial<
	Record<ConstraintField, Array<string>>
>;

/** What the form holds while being filled in. */
export type ConstraintFormValues = {
	name: string;
	/** "" until a type is chosen. */
	type: string;
	/** "" until chosen; left out for a type that takes none. */
	requirement: string;
	status: ConstraintStatus;
	/** Every field filled in so far, kept across a change of type; only the chosen type's are sent. */
	values: ConstraintFieldValues;
};

const key = "scheduling.constraints.dialog";

const isWholeNumber = (text = ""): boolean => /^\d+$/.test(text);

/** One field's values as its spec allows: how many, and for a number its range. A field not touched yet has none. */
const fieldSchema = (
	spec: ConstraintFieldSpec,
	t: TFunction
): z.ZodType<Array<string>> => {
	if (spec.kind === "NUMBER")
		return z
			.array(z.string())
			.refine(
				([text]) =>
					isWholeNumber(text) &&
					Number(text) >= (spec.min ?? 0) &&
					Number(text) <= (spec.max ?? Number.MAX_SAFE_INTEGER),
				t(`${key}.number`, { min: spec.min, max: spec.max })
			)
			.prefault([]);
	return z
		.array(z.string())
		.min(
			spec.minCount,
			spec.maxCount === 1
				? t(`${key}.chooseOne`)
				: t(`${key}.chooseAtLeast`, { count: spec.minCount })
		)
		.max(spec.maxCount, t(`${key}.chooseAtMost`, { count: spec.maxCount }))
		.prefault([]);
};

/** The only checks that tie two fields together, as the API's: days off within their period, no stand-in also counted. */
const checkConsistent = (
	values: ConstraintFieldValues,
	context: z.RefinementCtx,
	t: TFunction
): void => {
	const [daysOff, periodDays] = [values.DAYS_OFF?.[0], values.PERIOD_DAYS?.[0]];
	if (
		isWholeNumber(daysOff) &&
		isWholeNumber(periodDays) &&
		Number(daysOff) > Number(periodDays)
	)
		context.addIssue({
			code: "custom",
			path: ["values", "DAYS_OFF"],
			message: t(`${key}.daysOffOverPeriod`),
		});
	const counted = values.JOB_TITLE ?? [];
	if ((values.STAND_IN_JOB_TITLE ?? []).some((id) => counted.includes(id)))
		context.addIssue({
			code: "custom",
			path: ["values", "STAND_IN_JOB_TITLE"],
			message: t(`${key}.standInAlsoCounted`),
		});
};

/**
 * Mirrors the API's checks for a constraint of `type`, built from its spec: how
 * many values each field takes, a number's range, a requirement exactly
 * when the type takes one, and the two checks that tie fields together.
 * Name uniqueness, and whether the job titles and shifts are still live,
 * remain server decisions. Yields the API's body: the type's fields only,
 * one entry per value.
 */
export const constraintSchema = (
	type: ConstraintTypeOption | undefined,
	t: TFunction
): z.ZodType<ConstraintBody, ConstraintFormValues> => {
	const fields = type?.fields ?? [];
	return z
		.object({
			name: unitNameSchema({
				required: t(`${key}.nameRequired`),
				length: t(`${key}.nameLength`),
				characters: t(`${key}.nameCharacters`),
			}),
			type: z.enum(CONSTRAINT_TYPES, { error: t(`${key}.typeRequired`) }),
			requirement: type?.hasRequirement
				? z.enum(CONSTRAINT_REQUIREMENTS, {
						error: t(`${key}.requirementRequired`),
					})
				: z.string().transform(() => null),
			status: z.enum(CONSTRAINT_STATUSES),
			values: z.object(
				Object.fromEntries(
					fields.map((spec) => [spec.field, fieldSchema(spec, t)])
				)
			),
		})
		.superRefine(({ values }, context) => {
			checkConsistent(values, context, t);
		})
		.transform(({ values, ...constraint }) => ({
			...constraint,
			values: fields.flatMap(({ field }) =>
				(values[field] ?? []).map((value) => ({ field, value }))
			),
		}));
};
