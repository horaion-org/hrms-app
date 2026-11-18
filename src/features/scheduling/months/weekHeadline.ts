import type {
	MonthWeek,
	WeekPart,
	WeekState,
} from "@/features/scheduling/months/api";

/*
 * A week held by several schedules (API ADR-0113) is shown by the part that
 * needs the manager first, so a published newest part never hides an earlier
 * part still failed, generating or waiting for review.
 */

/** Week states in the order a manager acts on them: the first needs attention first; published is last. */
const ATTENTION_ORDER: ReadonlyArray<WeekState> = [
	"FAILED",
	"TO_REVIEW",
	"GENERATING",
	"REJECTED",
	"DRAFT",
	"UNKNOWN",
	"NOT_GENERATED",
	"PUBLISHED",
];

/** The week's part that needs the manager first, the earliest in day order on a tie; undefined without parts. */
export const partNeedingAttention = (
	parts: ReadonlyArray<WeekPart>
): WeekPart | undefined =>
	parts.reduce<WeekPart | undefined>(
		(first, part) =>
			first === undefined ||
			ATTENTION_ORDER.indexOf(part.state) < ATTENTION_ORDER.indexOf(first.state)
				? part
				: first,
		undefined
	);

/** What a week is shown as and opens: a week of several schedules by its part needing attention first, any other by itself. */
export const weekHeadline = (
	week: Pick<MonthWeek, "state" | "scheduleId" | "parts">
): Pick<MonthWeek, "state" | "scheduleId"> => {
	const part =
		week.parts.length > 1 ? partNeedingAttention(week.parts) : undefined;
	if (!part) return { state: week.state, scheduleId: week.scheduleId };
	return { state: part.state, scheduleId: part.scheduleId };
};
