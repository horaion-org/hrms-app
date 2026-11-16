import type { DepartmentConstraint } from "@/features/scheduling/constraints/api";

/*
 * How a long list of constraints is narrowed and folded: the "Showing"
 * filter's values, which constraints pass it, and which sections start closed.
 */

/** The "Showing" filter's kinds of choice; a value reads "kind:choice", e.g. "firmness:MUST". */
const SHOWING_KINDS = ["status", "firmness", "type"] as const;

type ShowingKind = (typeof SHOWING_KINDS)[number];

/** The status choices: needing attention, or switched off. */
export const SHOWING_STATUSES = ["NEEDS_ATTENTION", "INACTIVE"] as const;

/** The firmness choices: Must or If possible. */
export const SHOWING_FIRMNESS = ["MUST", "SHOULD"] as const;

/** One "Showing" value, as the filter's options carry it. */
export const showingValue = (kind: ShowingKind, choice: string): string =>
	`${kind}:${choice}`;

/** The chosen values by kind; an empty kind does not narrow. */
export type Showing = Record<ShowingKind, Array<string>>;

/** The filter's chosen values read by kind; values of no known kind are dropped. */
export const showingOf = (values: ReadonlyArray<string>): Showing => {
	const showing: Showing = { status: [], firmness: [], type: [] };
	for (const value of values) {
		const [kind, choice] = value.split(":");
		const known = SHOWING_KINDS.find((each) => each === kind);
		if (known && choice) showing[known].push(choice);
	}
	return showing;
};

/** What the filter reads of a constraint. */
export type ShowingRow = Pick<
	DepartmentConstraint,
	"type" | "requirement" | "status"
>;

/**
 * Whether a constraint passes the filter: within a kind any chosen choice will
 * do, and every kind with a choice must be met.
 */
export const passesShowing = <Row extends ShowingRow>(
	row: Row,
	showing: Showing,
	needsFixing: (row: Row) => boolean
): boolean => {
	const statuses = showing.status;
	const statusMet =
		statuses.length === 0 ||
		(statuses.includes("NEEDS_ATTENTION") && needsFixing(row)) ||
		(statuses.includes("INACTIVE") && row.status === "INACTIVE");
	const firmnessMet =
		showing.firmness.length === 0 ||
		(row.requirement !== null && showing.firmness.includes(row.requirement));
	const typeMet = showing.type.length === 0 || showing.type.includes(row.type);
	return statusMet && firmnessMet && typeMet;
};

/**
 * Above this many constraints in view, the page no longer shows its shape on
 * one screen (a row with its name and reach is about 90 px), so every
 * section starts closed; a closed heading still says, in the error tone,
 * how many need attention, and the banner's links open their section.
 */
export const OPEN_ALL_UP_TO = 12;

/** The key the company's own section is folded under. */
export const COMPANY_SECTION = "COMPANY";

/** One section as the starting fold reads it: its key and whether anything in it needs attention. */
export type FoldableSection = {
	key: string;
	rowCount: number;
	needsAttention: boolean;
};

/**
 * The sections that start closed: with up to OPEN_ALL_UP_TO constraints, only
 * the company's (it always applies, and is set elsewhere) unless something in
 * it needs attention; with more, every section.
 */
export const initiallyClosedOf = (
	sections: ReadonlyArray<FoldableSection>
): Array<string> => {
	const total = sections.reduce((sum, section) => sum + section.rowCount, 0);
	if (total > OPEN_ALL_UP_TO) return sections.map((section) => section.key);
	return sections
		.filter(
			(section) => section.key === COMPANY_SECTION && !section.needsAttention
		)
		.map((section) => section.key);
};
