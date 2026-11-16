/*
 * The classes the dashboard's cards share, so their failures, rows and
 * links read alike. A row is one line: what it is about on the left, and
 * its one action, or when it happens, on the right.
 */

/** The line a card shows when its read failed. */
export const failedLineClasses = "text-sm text-error-700";

/** A card's list of rows, with a rule between them. */
export const rowListClasses = "flex flex-col divide-y divide-neutral-300";

/** One row of a card's list: its text, then its action or its day. */
export const rowClasses =
	"flex min-h-10 items-center justify-between gap-3 py-2";

/** What a row is about, on one line from `sm` and on two at most on a phone. */
export const rowTextClasses =
	"line-clamp-2 min-w-0 text-sm text-neutral-800 sm:line-clamp-1";

/** The name a row leads with. */
export const rowLeadClasses = "font-semibold text-neutral-900";

/** A row's right side when there is nothing to do on it: when it happens. */
export const rowAsideClasses = "shrink-0 text-sm text-neutral-700";

/** A line of quiet detail in a card, such as the days its list covers. */
export const rowDetailClasses = "text-sm text-neutral-800";

/** How many rows a card on Home lists before it offers the rest. */
export const HOME_ROW_COUNT = 3;

/** A text link inside a card, as the setup card's links look. */
export const cardLinkClasses =
	"text-sm font-semibold text-ink-blue-700 underline underline-offset-2 hover:text-ink-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";
