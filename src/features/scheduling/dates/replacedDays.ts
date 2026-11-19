import type {
	DatesPlan,
	DayRun,
	PartDays,
} from "@/features/scheduling/dates/api";
import { dayAfter } from "@/features/scheduling/dates/datesSetup";
import { handChangesReplacedIn } from "@/features/scheduling/dates/handChanges";
import type { WeekState } from "@/features/scheduling/months/api";

/** What a run by dates replaces: the rosters to review whose days it works out again. */
export type ReplacedDays = {
	/** The days holding a roster to review that the run works out again, as runs in day order. */
	days: Array<DayRun>;
	/** Those of them staff saw: their roster was published and then withdrawn. */
	seenByStaff: Array<DayRun>;
	/** How many of the replaced days carry a change made by hand. */
	handChanges: number;
};

/** The states of a part that holds a roster to review; any other has no roster to replace. */
const ROSTER_TO_REVIEW: ReadonlyArray<WeekState> = ["TO_REVIEW", "REJECTED"];

/** The parts' days as runs, in the order given: a part starting the day after the last run ends joins it. */
const joinedRunsOf = (parts: ReadonlyArray<PartDays>): Array<DayRun> => {
	const runs: Array<DayRun> = [];
	for (const part of parts) {
		const last = runs[runs.length - 1];
		if (last && dayAfter(last.to) === part.coveredFrom)
			last.to = part.coveredTo;
		else runs.push({ from: part.coveredFrom, to: part.coveredTo });
	}
	return runs;
};

/**
 * What generating `plan` replaces: the days of every part it works out again
 * (`redone`, and `rest` to the Sunday) that holds a roster to review, which of
 * them staff saw (`publishedOnce`) and how many carry a hand change.
 * Undefined when it replaces no roster: only empty days are filled. The plan
 * lists weeks and parts in day order, and so do the runs. Pure.
 */
export const replacedDaysOf = (plan: DatesPlan): ReplacedDays | undefined => {
	const replaced = plan.weeks
		.flatMap((week) => [...week.redone, ...week.rest])
		.filter((part) => ROSTER_TO_REVIEW.includes(part.state));
	if (replaced.length === 0) return undefined;
	return {
		days: joinedRunsOf(replaced),
		seenByStaff: joinedRunsOf(
			replaced.filter((part) => part.publishedOnce === true)
		),
		handChanges: plan.weeks.reduce(
			(total, week) => total + handChangesReplacedIn(week),
			0
		),
	};
};
