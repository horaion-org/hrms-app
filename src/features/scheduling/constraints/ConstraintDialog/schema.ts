import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	CONSTRAINT_REQUIREMENTS,
	CONSTRAINT_STATUSES,
	CONSTRAINT_TYPES,
	POLICY_LOCKS,
	type ConstraintBody,
	type ConstraintField,
	type ConstraintFieldSpec,
	type ConstraintStatus,
	type ConstraintTypeOption,
	type PolicyLock,
} from "@/features/scheduling/constraints/api";
import {
	valuesListingNone,
	type LinksByKind,
} from "@/features/scheduling/constraints/ConstraintDialog/fieldChoices";
import {
	unitReachBody,
	unitReachSchema,
	type UnitReachValue,
} from "@/features/workspace/unitReach";

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
	/** A company constraint's lock; empty or absent when the dialog does not offer one. */
	lock?: string;
	/** Every field filled in so far, kept across a change of type; only the chosen type's are sent. */
	values: ConstraintFieldValues;
	/** Where a work-policy constraint applies; absent when the dialog does not offer it. */
	reach?: UnitReachValue;
};

/** What the dialog sends: a constraint body, with a lock and where it applies when it edits the work policy. */
export type ConstraintDialogBody = ConstraintBody & {
	lock?: PolicyLock;
	appliesToBranchIds?: Array<string>;
	appliesToDepartmentIds?: Array<string>;
};

const key = "scheduling.constraints.dialog";

const isWholeNumber = (text = ""): boolean => /^\d+$/.test(text);

/** One field's values as its spec allows: how many, and for a number its range. A field not touched yet has none. */
const fieldSchema = (
	spec: ConstraintFieldSpec,
	t: TFunction
): z.ZodType<Array<string>> => {
	// A number the type may leave out is valid with none; one given must still fit its range.
	if (spec.kind === "NUMBER")
		return z
			.array(z.string())
			.refine(
				([text]) =>
					(spec.minCount === 0 && text === undefined) ||
					(isWholeNumber(text) &&
						Number(text) >= (spec.min ?? 0) &&
						Number(text) <= (spec.max ?? Number.MAX_SAFE_INTEGER)),
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

/**
 * What the form knows of the shifts and job titles to judge how fields fit
 * each other: what each lists, and each one's name for the message.
 */
export type FieldFit = {
	links: LinksByKind;
	nameOf: (id: string) => string;
};

/**
 * The checks that tie fields together, as the API's: days off within their
 * period, then, from the type's declarations, no value also chosen in the
 * field it `excludes`, and no value of a `listsSomeOf` field that lists none
 * of the chosen values of those fields.
 */
const checkConsistent = (
	values: ConstraintFieldValues,
	context: z.RefinementCtx,
	t: TFunction,
	fields: ReadonlyArray<ConstraintFieldSpec>,
	fit: FieldFit
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
	const label = (field: ConstraintField): string =>
		t(`scheduling.constraints.fields.${field}`);
	for (const spec of fields) {
		const excluded = spec.excludes ? (values[spec.excludes] ?? []) : [];
		if (
			spec.excludes &&
			(values[spec.field] ?? []).some((id) => excluded.includes(id))
		)
			context.addIssue({
				code: "custom",
				path: ["values", spec.field],
				message: t(`${key}.dependency.alsoChosen`, {
					field: label(spec.excludes),
				}),
			});
	}
	const listingNone = valuesListingNone(fields, values, fit.links);
	for (const spec of fields) {
		const ids = listingNone[spec.field];
		if (!ids) continue;
		const listed = spec.listsSomeOf.flatMap((field) => values[field] ?? []);
		context.addIssue({
			code: "custom",
			path: ["values", spec.field],
			message: t(`${key}.dependency.listsNone`, {
				count: ids.length,
				names: t("scheduling.constraints.list", {
					items: ids.map(fit.nameOf),
				}),
				listed: t("scheduling.constraints.listOr", {
					items: listed.map(fit.nameOf),
				}),
			}),
		});
	}
};

/**
 * Mirrors the API's checks for a constraint of `type`, built from its spec: how
 * many values each field takes, a number's range, a requirement exactly
 * when the type takes one, and the checks that tie fields together, judged
 * with `fit`.
 * Name uniqueness, and whether the job titles and shifts are still live,
 * remain server decisions. Yields the API's body: the type's fields only,
 * one entry per value, with `withLock` the work-policy constraint's lock, and
 * with `withReach` where it applies.
 */
export const constraintSchema = (
	type: ConstraintTypeOption | undefined,
	t: TFunction,
	withLock = false,
	withReach = false,
	fit: FieldFit = { links: {}, nameOf: (id) => id }
): z.ZodType<ConstraintDialogBody, ConstraintFormValues> => {
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
			lock: withLock
				? z.enum(POLICY_LOCKS, { error: t(`${key}.lockRequired`) })
				: z
						.string()
						.optional()
						.transform(() => undefined),
			values: z.object(
				Object.fromEntries(
					fields.map((spec) => [spec.field, fieldSchema(spec, t)])
				)
			),
			reach: withReach
				? unitReachSchema(t)
				: z
						.custom<UnitReachValue>()
						.optional()
						.transform(() => undefined),
		})
		.superRefine(({ values }, context) => {
			checkConsistent(values, context, t, fields, fit);
		})
		.transform(({ values, lock, reach, ...constraint }) => ({
			...constraint,
			...(lock === undefined ? {} : { lock }),
			...(reach === undefined ? {} : unitReachBody(reach)),
			values: fields.flatMap(({ field }) =>
				(values[field] ?? []).map((value) => ({ field, value }))
			),
		}));
};
