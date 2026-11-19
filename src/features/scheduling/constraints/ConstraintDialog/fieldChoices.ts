import type {
	ConstraintComparison,
	ConstraintField,
	ConstraintFieldKind,
	ConstraintFieldSpec,
	ConstraintOptions,
	ListedIds,
} from "@/features/scheduling/constraints/api";
import type { ConstraintFieldValues } from "@/features/scheduling/constraints/ConstraintDialog/schema";

/*
 * Which shifts and job titles a rule's fields may hold, given what is chosen
 * in the others, pure and driven only by the type's declarations (the API's
 * ADR-0085): `listedBy` (a value must be listed by every chosen value of
 * another field, so several shifts offer only the job titles they share, as
 * v1's "all" match did), `excludes` (no value may also be a value of another field) and
 * `listsSomeOf` (each value must list a chosen value of other fields). No
 * rule type or field is named here.
 */

/** A shift or job title as the fit is judged: its id and what it lists, by kind. */
export type LinkChoice = { id: string; listedIds: ListedIds };

/** Every shift and job title the dialog may offer, by the kind of field that holds them. */
export type LinksByKind = Partial<
	Record<ConstraintFieldKind, ReadonlyArray<LinkChoice>>
>;

/**
 * Why a value was taken out of the form: not every chosen parent lists it,
 * another field already holds it, or a comparison the field's partial set of
 * day types does not take.
 */
export type RemovalReason = "NOT_LISTED" | "EXCLUDED" | "PARTIAL";

/** A value taken out of the form, and why. */
export type RemovedValue = {
	field: ConstraintField;
	value: string;
	reason: RemovalReason;
};

/** The constraint options' shifts and job titles, keyed by field kind. */
export const linksByKindOf = (
	options: Pick<ConstraintOptions, "shifts" | "jobTitles"> | undefined
): LinksByKind => ({
	SHIFT: (options?.shifts ?? []).map(({ shiftId, listedIds }) => ({
		id: shiftId,
		listedIds,
	})),
	JOB_TITLE: (options?.jobTitles ?? []).map(({ jobTitleId, listedIds }) => ({
		id: jobTitleId,
		listedIds,
	})),
});

const specOf = (
	specs: ReadonlyArray<ConstraintFieldSpec>,
	field: ConstraintField
): ConstraintFieldSpec | undefined =>
	specs.find((spec) => spec.field === field);

/** What one chosen link lists under `kind`; nothing for a link no longer offered. */
const listedUnder = (
	links: LinksByKind,
	linkKind: ConstraintFieldKind,
	id: string,
	kind: ConstraintFieldKind
): ReadonlyArray<string> =>
	links[linkKind]?.find((link) => link.id === id)?.listedIds[kind] ?? [];

/**
 * The chosen values of a field that are still offered, so a shift no longer
 * offered is never asked, as the API does not ask a deleted one.
 */
const offeredChosen = (
	spec: ConstraintFieldSpec,
	values: ConstraintFieldValues,
	links: LinksByKind
): Array<string> =>
	(values[spec.field] ?? []).filter((id) =>
		(links[spec.kind] ?? []).some((link) => link.id === id)
	);

/** Whether every offered chosen value of `parent` lists `value`; never with none chosen, so nothing is offered yet. */
const listedByEveryChosen = (
	parent: ConstraintFieldSpec,
	kind: ConstraintFieldKind,
	values: ConstraintFieldValues,
	links: LinksByKind,
	value: string
): boolean => {
	const parents = offeredChosen(parent, values, links);
	return (
		parents.length > 0 &&
		parents.every((parentId) =>
			listedUnder(links, parent.kind, parentId, kind).includes(value)
		)
	);
};

/** Why `value` cannot be held by `spec` with these values, or undefined when it fits. */
const unfitReason = (
	spec: ConstraintFieldSpec,
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	links: LinksByKind,
	value: string
): RemovalReason | undefined => {
	const parent = spec.listedBy ? specOf(specs, spec.listedBy) : undefined;
	if (parent && !listedByEveryChosen(parent, spec.kind, values, links, value))
		return "NOT_LISTED";
	if (spec.excludes && (values[spec.excludes] ?? []).includes(value))
		return "EXCLUDED";
	return undefined;
};

/**
 * The ids a link field may offer now: every one of its kind, then only
 * those every chosen value of its `listedBy` field lists (none while nothing
 * is chosen there), without the values its `excludes` field holds. A field
 * with no declarations offers all of them.
 */
export const allowedLinkIds = (
	spec: ConstraintFieldSpec,
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	links: LinksByKind
): Array<string> =>
	(links[spec.kind] ?? [])
		.map((link) => link.id)
		.filter((id) => unfitReason(spec, specs, values, links, id) === undefined);

/**
 * Whether a `listedBy` field offers nothing because the two or more values
 * chosen in the field it depends on share none of its kind: the shifts
 * chosen have no job title in common. One chosen value, or none, is never
 * this.
 */
export const sharesNothing = (
	spec: ConstraintFieldSpec,
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	links: LinksByKind
): boolean => {
	const parent = spec.listedBy ? specOf(specs, spec.listedBy) : undefined;
	if (!parent || offeredChosen(parent, values, links).length < 2) return false;
	return !(links[spec.kind] ?? []).some((link) =>
		listedByEveryChosen(parent, spec.kind, values, links, link.id)
	);
};

/**
 * The values with every one that no longer fits taken out, field by field in
 * the type's order (so a job title taken out frees its stand-in place), and
 * what was taken out.
 */
export const withoutUnfitting = (
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	links: LinksByKind
): { values: ConstraintFieldValues; removed: Array<RemovedValue> } => {
	const kept: ConstraintFieldValues = { ...values };
	const removed: Array<RemovedValue> = [];
	for (const spec of specs) {
		const chosen = kept[spec.field];
		if (chosen === undefined || (!spec.listedBy && !spec.excludes)) continue;
		kept[spec.field] = chosen.filter((value) => {
			const reason = unfitReason(spec, specs, kept, links, value);
			if (reason) removed.push({ field: spec.field, value, reason });
			return reason === undefined;
		});
	}
	return { values: kept, removed };
};

/**
 * Per field that declares `listsSomeOf`, its chosen values that list none of
 * the chosen values of those fields: on such a shift, no one could be
 * counted. Nothing while none of those fields has a value yet; a value no
 * longer offered is never named, since what it lists is not known.
 */
export const valuesListingNone = (
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	links: LinksByKind
): Partial<Record<ConstraintField, Array<string>>> => {
	const result: Partial<Record<ConstraintField, Array<string>>> = {};
	for (const spec of specs) {
		const named = spec.listsSomeOf.flatMap((field) => {
			const namedSpec = specOf(specs, field);
			return namedSpec
				? (values[field] ?? []).map((id) => ({ id, kind: namedSpec.kind }))
				: [];
		});
		if (named.length === 0) continue;
		const offered = links[spec.kind] ?? [];
		const listingNone = (values[spec.field] ?? []).filter(
			(value) =>
				offered.some((link) => link.id === value) &&
				!named.some(({ id, kind }) =>
					listedUnder(links, spec.kind, value, kind).includes(id)
				)
		);
		if (listingNone.length > 0) result[spec.field] = listingNone;
	}
	return result;
};

/** The day type codes a field offers: its own choices, or every code the API lists when it names none (ADR-0087). */
export const dayTypeCodesOf = (
	spec: ConstraintFieldSpec,
	everyCode: ReadonlyArray<string>
): ReadonlyArray<string> =>
	spec.choices.length > 0 ? spec.choices : everyCode;

/**
 * What a field shows as chosen: an optional field of choices with none
 * chosen means every choice (the API stores "every" as none), so it shows
 * them all.
 */
export const shownValuesOf = (
	spec: ConstraintFieldSpec,
	chosen: ReadonlyArray<string>
): Array<string> =>
	spec.minCount === 0 && spec.choices.length > 0 && chosen.length === 0
		? [...spec.choices]
		: [...chosen];

/** Whether a field of choices holds some but not every one of them. */
const isPartial = (
	spec: ConstraintFieldSpec,
	chosen: ReadonlyArray<string>
): boolean =>
	spec.choices.length > 0 &&
	chosen.length > 0 &&
	!spec.choices.every((code) => chosen.includes(code));

/**
 * The comparisons the type offers now: every one its comparison field takes,
 * but only those a field declares for a partial set while that field holds
 * some but not every one of its choices.
 */
export const allowedComparisons = (
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	comparisons: ReadonlyArray<ConstraintComparison>
): Array<ConstraintComparison> =>
	specs
		.filter(
			(spec) =>
				spec.partialComparisons.length > 0 &&
				isPartial(spec, values[spec.field] ?? [])
		)
		.reduce(
			(allowed, spec) =>
				allowed.filter((comparison) =>
					spec.partialComparisons.includes(comparison)
				),
			[...comparisons]
		);

/**
 * The type's comparison field's chosen value taken out when a partial set of
 * day types no longer takes it, and why; `comparisons` is every comparison
 * that field takes.
 */
export const withoutUnfitComparison = (
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	comparisons: ReadonlyArray<ConstraintComparison>
): { values: ConstraintFieldValues; removed: Array<RemovedValue> } => {
	const comparisonField = specs.find((spec) => spec.kind === "COMPARISON")?.field;
	if (!comparisonField) return { values, removed: [] };
	const allowed: ReadonlyArray<string> = allowedComparisons(
		specs,
		values,
		comparisons
	);
	const chosen = values[comparisonField] ?? [];
	const removed = chosen
		.filter((value) => !allowed.includes(value))
		.map((value) => ({
			field: comparisonField,
			value,
			reason: "PARTIAL" as const,
		}));
	if (removed.length === 0) return { values, removed };
	return {
		values: {
			...values,
			[comparisonField]: chosen.filter((value) => allowed.includes(value)),
		},
		removed,
	};
};
