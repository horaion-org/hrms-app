import type {
	ColumnPinningPosition,
	ColumnPinningState,
} from "@tanstack/react-table";

/** Which edge a column stays at while the table scrolls sideways. */
export type ColumnPin = "start" | "end";

/**
 * The table's pinning state from the columns that ask to stay in view. One
 * column per side keeps every offset a fixed CSS class, so a second pin on a
 * side is a programming error.
 */
export const pinningStateOf = (
	columns: ReadonlyArray<{ id: string; pin?: ColumnPin }>
): ColumnPinningState => {
	const start = columns
		.filter((column) => column.pin === "start")
		.map((column) => column.id);
	const end = columns
		.filter((column) => column.pin === "end")
		.map((column) => column.id);
	if (start.length > 1 || end.length > 1) {
		throw new Error(
			`DataTable pins at most one column per side, got start [${start.join(", ")}] and end [${end.join(", ")}].`
		);
	}
	return { start, end };
};

// Leading cells (the row expander, then the row checkbox) are each `w-12`, so
// the n-th sticky cell at the start sits n × 3rem in: up to two leading cells,
// then a start-pinned column. Full class names keep them visible to Tailwind.
const START_OFFSETS = ["md:start-0", "md:start-12", "md:start-24"] as const;

/** Keeps a cell at the start edge from `md` up, after `offset` leading cells. */
export const stickyStartClasses = (offset: number): string => {
	const inset = START_OFFSETS[offset];
	if (!inset) {
		throw new Error(`DataTable has no sticky offset for ${offset} cells.`);
	}
	return `md:sticky md:z-1 ${inset}`;
};

// A soft edge on the side facing the scrolled content, shown only while some
// of it is hidden beneath the pinned column (the frame's data attributes).
const startEdgeShadow =
	"md:after:pointer-events-none md:after:absolute md:after:inset-y-0 md:after:-end-2 md:after:w-2 md:after:bg-linear-to-r md:after:from-neutral-900/10 md:after:to-transparent md:after:opacity-0 md:group-data-overflows-start:after:opacity-100";

const endEdgeShadow =
	"md:before:pointer-events-none md:before:absolute md:before:inset-y-0 md:before:-start-2 md:before:w-2 md:before:bg-linear-to-l md:before:from-neutral-900/10 md:before:to-transparent md:before:opacity-0 md:group-data-overflows-end:before:opacity-100";

/**
 * Classes for a data column's header and body cells: sticky with an edge
 * shadow when pinned, nothing otherwise. `leadingCount` is how many leading
 * cells sit before the start-pinned column.
 */
export const pinnedCellClasses = (
	pin: ColumnPinningPosition,
	leadingCount: number
): string | undefined => {
	if (pin === "start")
		return `${stickyStartClasses(leadingCount)} ${startEdgeShadow}`;
	if (pin === "end") return `md:sticky md:z-1 md:end-0 ${endEdgeShadow}`;
	return undefined;
};
