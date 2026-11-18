import type { HistoryState } from "@tanstack/react-router";
import { z } from "zod";
import type { DayRun } from "@/features/scheduling/dates/api";
import { monthOf } from "@/features/scheduling/months/monthWeeks";
import { withRefusedWeeks } from "@/features/scheduling/months/refusedWeeksState";

/*
 * A run by dates goes to the department timeline from its first day's week.
 * The days it ran travel in history state (as the refused weeks do), so the
 * timeline, or a month page reached the older way, can say what is being
 * generated; a month page also points to the next month's page for the days
 * a run past a month end puts there.
 */

const stateSchema = z.object({
	/** The run's first and last day. */
	datesRun: z.object({ from: z.string(), to: z.string() }),
});

/** Carries a run by dates' refused weeks and its days to the next page in history state. */
export const withDatesRun =
	(
		refusedWeeks: Record<string, string>,
		{ firstDay, lastDay }: { firstDay: string; lastDay: string }
	): ((previous: HistoryState) => HistoryState) =>
	(previous) => ({
		...withRefusedWeeks(refusedWeeks)(previous),
		datesRun: { from: firstDay, to: lastDay },
	});

/** The days of the run by dates the history state carries, or undefined when the page was not reached from one. */
export const datesRunOf = (state: unknown): DayRun | undefined => {
	const parsed = stateSchema.safeParse(state);
	return parsed.success ? parsed.data.datesRun : undefined;
};

/** What the month page says on arrival from a run by dates: its days, and the next month's share when it has one. */
export type DatesRunNotice = {
	days: DayRun;
	otherMonth?: { month: string; days: DayRun };
};

/**
 * The notice for `month`'s page from the history state, or undefined when the
 * page was not reached from a run by dates starting in that month.
 */
export const datesRunNoticeOf = (
	state: unknown,
	month: string
): DatesRunNotice | undefined => {
	const days = datesRunOf(state);
	if (!days || monthOf(days.from) !== month) return undefined;
	const lastMonth = monthOf(days.to);
	if (lastMonth === month) return { days };
	return {
		days,
		otherMonth: {
			month: lastMonth,
			days: { from: `${lastMonth}-01`, to: days.to },
		},
	};
};
