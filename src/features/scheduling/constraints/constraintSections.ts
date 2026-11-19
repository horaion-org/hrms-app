import type {
	ConstraintCategory,
	DepartmentConstraint,
} from "@/features/scheduling/constraints/api";

/** What the sections read of a constraint. */
export type SectionedConstraint = Pick<
	DepartmentConstraint,
	"category" | "level" | "requirement" | "name"
>;

/** One purpose's section: its category and its constraints, what needs fixing first. */
export type ConstraintSection<Row extends SectionedConstraint> = {
	category: ConstraintCategory;
	rows: Array<Row>;
};

/** A list of constraints laid out by purpose, the company's apart, and what needs fixing named once. */
export type ConstraintSections<Row extends SectionedConstraint> = {
	sections: Array<ConstraintSection<Row>>;
	company: Array<Row>;
	needingAttention: Array<Row>;
};

/** Must before If possible before a rule that offers no choice. */
const FIRMNESS_ORDER: Record<string, number> = { MUST: 0, SHOULD: 1 };
const NO_FIRMNESS = 2;

/**
 * Lays constraints out by what they are for: one section per category the API
 * offers, in its order, even with none yet (then any other, as first met), each
 * with what needs attention first, then Must, If possible and by name. The
 * company's own constraints stand apart, as given, unless the list is the
 * work policy itself (`keepCompanyApart` false); `needingAttention` names every
 * one that needs fixing, in section order.
 */
export const constraintSectionsOf = <Row extends SectionedConstraint>(
	rows: ReadonlyArray<Row>,
	categoryOrder: ReadonlyArray<ConstraintCategory>,
	needsFixing: (row: Row) => boolean,
	keepCompanyApart = true
): ConstraintSections<Row> => {
	const apart = (row: Row): boolean =>
		keepCompanyApart && row.level === "COMPANY";
	const company = rows.filter(apart);
	const own = rows.filter((row) => !apart(row));
	const categories = [
		...new Set([...categoryOrder, ...own.map((row) => row.category)]),
	];
	const rank = (row: Row): [number, number] => [
		needsFixing(row) ? 0 : 1,
		row.requirement === null
			? NO_FIRMNESS
			: (FIRMNESS_ORDER[row.requirement] ?? NO_FIRMNESS),
	];
	const inOrder = (a: Row, b: Row): number => {
		const [attentionA, firmnessA] = rank(a);
		const [attentionB, firmnessB] = rank(b);
		return (
			attentionA - attentionB ||
			firmnessA - firmnessB ||
			a.name.localeCompare(b.name)
		);
	};
	const sections = categories.map((category) => ({
		category,
		rows: own.filter((row) => row.category === category).sort(inOrder),
	}));
	return {
		sections,
		company,
		needingAttention: [
			...sections.flatMap((section) => section.rows),
			...company,
		].filter(needsFixing),
	};
};
