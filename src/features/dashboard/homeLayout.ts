import type { HomeSection } from "@/features/dashboard/homeSections";

/*
 * How Home lays its sections out, decided in one place so the page only
 * renders it. A section with rows is a card on the grid; one with nothing
 * to act on is a quiet tile at zero, never an empty box.
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

/**
 * Each card's width, in the order given: two to a row. With an odd number
 * of cards the first, the most urgent, takes the whole row, so no card sits
 * beside an empty space and at most one is wide.
 */
export const cardSpans = (
	cards: ReadonlyArray<HomeSection>
): Map<HomeSection, CardSpan> =>
	new Map(
		cards.map((section, index) => [
			section,
			cards.length % 2 === 1 && index === 0 ? "full" : "half",
		])
	);
