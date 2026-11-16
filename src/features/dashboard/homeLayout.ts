import type { HomeSection } from "@/features/dashboard/homeSections";

/*
 * How Home lays its sections out, decided in one place so the page only
 * renders it. A section with rows is a card on the grid; one with nothing
 * to act on is a sentence in the "all clear" note, never an empty box.
 */

/**
 * What a section has to show: out of reach or hidden, not yet known, known
 * and with nothing to act on, or with something to show (a failure too).
 */
export type SectionState = "hidden" | "pending" | "empty" | "content";

/** A read's state as a section's, given how many rows it has to show. */
export const sectionStateOf = (
	status: "hidden" | "pending" | "error" | "ready",
	rowCount: number
): SectionState => {
	if (status === "hidden" || status === "pending") return status;
	if (status === "error") return "content";
	return rowCount > 0 ? "content" : "empty";
};

/** How wide a card sits on Home's two-column grid. */
export type CardSpan = "full" | "half";

/** The section whose rows are long enough to want the whole row. */
const LEAD_SECTION: HomeSection = "short-shifts";

/**
 * Each card's width, in the order given. The lead card takes the whole
 * row; the rest pair up, and a card left without a neighbour takes the
 * whole row too, so none sits beside an empty space.
 */
export const cardSpans = (
	cards: ReadonlyArray<HomeSection>
): Map<HomeSection, CardSpan> => {
	const paired = cards.filter((section) => section !== LEAD_SECTION);
	const leftAlone =
		paired.length % 2 === 1 ? paired[paired.length - 1] : undefined;
	return new Map(
		cards.map((section) => [
			section,
			section === LEAD_SECTION || section === leftAlone ? "full" : "half",
		])
	);
};
