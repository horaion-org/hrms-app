/*
 * The classes the dashboard's cards share, so their empty lines, failures,
 * rows and links read alike.
 */

/** The calm line a card shows when it has nothing to act on. */
export const emptyLineClasses = "text-sm text-neutral-700";

/** The line a card shows when its read failed. */
export const failedLineClasses = "text-sm text-error-700";

/** A card's list of rows, divided like the pending leave list. */
export const rowListClasses = "flex flex-col divide-y divide-neutral-300";

/** One row of a card's list. */
export const rowClasses = "flex flex-col gap-1 py-3 first:pt-0 last:pb-0";

/** A row's main line. */
export const rowTitleClasses = "text-sm font-semibold text-neutral-900";

/** A row's second line. */
export const rowDetailClasses = "text-sm text-neutral-800";

/** A text link inside a card, as the setup card's links look. */
export const cardLinkClasses =
	"text-sm font-semibold text-ink-blue-700 underline underline-offset-2 hover:text-ink-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";
