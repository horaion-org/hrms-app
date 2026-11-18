import type { PartDays } from "@/features/scheduling/dates/api";

/**
 * How many days a dates run replaces in `week` that carry a hand change: the
 * sum over the parts whose days are scheduled again (`redone`, and `rest` to
 * the Sunday). A part with no count (kept only, no roster, an older API)
 * counts as none. Pure.
 */
export const handChangesReplacedIn = (week: {
	redone: ReadonlyArray<PartDays>;
	rest: ReadonlyArray<PartDays>;
}): number =>
	[...week.redone, ...week.rest].reduce(
		(total, part) => total + (part.handChangedDays ?? 0),
		0
	);
