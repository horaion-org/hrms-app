import type { TFunction } from "i18next";
import type { WeekState } from "@/features/scheduling/months/api";
import { stateCounts } from "@/features/scheduling/months/monthWeeks";

/*
 * The months' words that take the person's language, kept apart from the
 * pure dates and weeks of `monthWeeks.ts`, as readiness keeps its copy in
 * `readinessCopy.ts`.
 */

/** The order the summary line names the states in. */
const COUNTED_STATES: ReadonlyArray<Exclude<WeekState, "NOT_GENERATED">> = [
	"PUBLISHED",
	"TO_REVIEW",
	"TENTATIVE",
	"GENERATING",
	"FAILED",
	"REJECTED",
	"DRAFT",
	"UNKNOWN",
];

/** The month's weeks counted by state as one line, e.g. "2 published · 1 to review · 2 tentative". */
export const stateCountsLine = (
	weeks: ReadonlyArray<{ state: WeekState }>,
	t: TFunction
): string => {
	const counts = stateCounts(weeks);
	return COUNTED_STATES.filter((state) => counts[state] !== undefined)
		.map((state) =>
			t(`scheduling.months.counts.${state}`, { count: counts[state] ?? 0 })
		)
		.join(" · ");
};
