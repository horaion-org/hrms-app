import { useEffect, type RefObject } from "react";

/** Joins and splits a set of cell keys into one comparable value; keys (`membershipId|date`) never hold it. */
const KEY_SEPARATOR = "\n";

/**
 * Scrolls the first day cell a previewed change touches (in the grid's row
 * and day order) into view inside `gridRef`, once each time the touched days
 * become a new set; the same days passed again do not scroll.
 */
export const usePreviewedCellInView = (
	gridRef: RefObject<HTMLElement | null>,
	previewDays: ReadonlySet<string> | undefined
): void => {
	// Compared by content: callers build a new Set for the same days.
	const touchedDays = [...(previewDays ?? [])].sort().join(KEY_SEPARATOR);
	useEffect(() => {
		if (touchedDays === "") return;
		const touched = new Set(touchedDays.split(KEY_SEPARATOR));
		const cells = gridRef.current?.querySelectorAll<HTMLElement>("[data-cell]");
		const firstTouchedCell = Array.from(cells ?? []).find((cell) =>
			touched.has(cell.dataset["cell"] ?? "")
		);
		firstTouchedCell?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [gridRef, touchedDays]);
};
