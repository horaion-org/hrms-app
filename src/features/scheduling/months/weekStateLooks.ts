import type { BadgeTone } from "@/components/ui/Badge";
import type { MonthWeek, WeekState } from "@/features/scheduling/months/api";

/*
 * How a week's state looks on the month page and the Schedules tab. The
 * words are `scheduling.months.states.<STATE>`.
 */

/**
 * The badge tone of each week state. To review wears `warning`, as a
 * generated, undecided schedule does today; the mock-up's blue has no tone.
 */
export const weekStateTones: Record<WeekState, BadgeTone> = {
	PUBLISHED: "success",
	TO_REVIEW: "warning",
	TENTATIVE: "neutral",
	GENERATING: "warning",
	FAILED: "error",
	REJECTED: "error",
	DRAFT: "neutral",
	NOT_GENERATED: "neutral",
	UNKNOWN: "neutral",
};

const ROSTER_STATES: ReadonlyArray<WeekState> = [
	"PUBLISHED",
	"TO_REVIEW",
	"TENTATIVE",
];

/** Whether a week has a roster to summarise (day marks, cover text, days changed by hand). */
export const hasRoster = (state: WeekState): boolean =>
	ROSTER_STATES.includes(state);

/**
 * The week card's one action: Review on the week under review, Open on any
 * other week with a schedule (a draft opens its setup, a rejected week its
 * roster), none on a week without one.
 */
export const weekAction = ({
	state,
	scheduleId,
}: Pick<MonthWeek, "state" | "scheduleId">): "review" | "open" | undefined => {
	if (state === "TO_REVIEW") return "review";
	return scheduleId ? "open" : undefined;
};
