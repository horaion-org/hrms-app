import type {
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
 * ADR-0085): `listedBy` (a value must be listed by a chosen value of another
 * field), `excludes` (no value may also be a value of another field) and
 * `listsSomeOf` (each value must list a chosen value of other fields). No
 * rule type or field is named here.
 */

/** A shift or job title as the fit is judged: its id and what it lists, by kind. */
export type LinkChoice = { id: string; listedIds: ListedIds };

/** Every shift and job title the dialog may offer, by the kind of field that holds them. */
export type LinksByKind = Partial<
	Record<ConstraintFieldKind, ReadonlyArray<LinkChoice>>
>;

/** Why a value was taken out of the form: no chosen parent lists it, or another field already holds it. */
export type RemovalReason = "NOT_LISTED" | "EXCLUDED";

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

/** Why `value` cannot be held by `spec` with these values, or undefined when it fits. */
const unfitReason = (
	spec: ConstraintFieldSpec,
	specs: ReadonlyArray<ConstraintFieldSpec>,
	values: ConstraintFieldValues,
	links: LinksByKind,
	value: string
): RemovalReason | undefined => {
	const parent = spec.listedBy ? specOf(specs, spec.listedBy) : undefined;
	if (
		parent &&
		!(values[parent.field] ?? []).some((parentId) =>
			listedUnder(links, parent.kind, parentId, spec.kind).includes(value)
		)
	)
		return "NOT_LISTED";
	if (spec.excludes && (values[spec.excludes] ?? []).includes(value))
		return "EXCLUDED";
	return undefined;
};

/**
 * The ids a link field may offer now: every one of its kind, then only
 * those a chosen value of its `listedBy` field lists, without the values its
 * `excludes` field holds. A field with no declarations offers all of them.
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
