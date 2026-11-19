import { describe, expect, it } from "vitest";
import type {
	DatesPlan,
	DatesPlanWeek,
	PartDays,
} from "@/features/scheduling/dates/api";
import { datesPlanFixture } from "@/features/scheduling/dates/fixtures";
import { replacedDaysOf } from "@/features/scheduling/dates/replacedDays";

/** A part covering `coveredFrom` to `coveredTo`, to review and never published unless `changes` says. */
const partOf = (
	coveredFrom: string,
	coveredTo: string,
	changes: Partial<PartDays> = {}
): PartDays => ({
	scheduleId: `s-${coveredFrom}`,
	coveredFrom,
	coveredTo,
	state: "TO_REVIEW",
	handChangedDays: 0,
	publishedOnce: false,
	...changes,
});

/** The week of 16 Nov 2026 asked whole, holding `lists`. */
const weekOf16 = (
	lists: Partial<Pick<DatesPlanWeek, "kept" | "redone" | "rest">>
): DatesPlanWeek => ({
	periodStart: "2026-11-16",
	periodEnd: "2026-11-22",
	askedFrom: "2026-11-16",
	askedTo: "2026-11-22",
	newFrom: "2026-11-16",
	newTo: "2026-11-22",
	action: "CREATE_AND_GENERATE",
	draftId: null,
	kept: [],
	redone: [],
	rest: [],
	...lists,
});

/** A plan of `weeks`. */
const planOf = (...weeks: Array<DatesPlanWeek>): DatesPlan =>
	datesPlanFixture({ weeks });

const WITHDRAWN = { publishedOnce: true };

describe("replacedDaysOf", () => {
	it.each([
		{
			case: "only empty days",
			plan: datesPlanFixture(),
			expected: undefined,
		},
		{
			case: "a roster to review, never published",
			plan: planOf(weekOf16({ redone: [partOf("2026-11-16", "2026-11-22")] })),
			expected: {
				days: [{ from: "2026-11-16", to: "2026-11-22" }],
				seenByStaff: [],
				handChanges: 0,
			},
		},
		{
			// The owner's case: published, withdrawn, then asked again.
			case: "a withdrawn roster changed by hand",
			plan: planOf(
				weekOf16({
					redone: [
						partOf("2026-11-19", "2026-11-22", {
							...WITHDRAWN,
							handChangedDays: 3,
						}),
					],
				})
			),
			expected: {
				days: [{ from: "2026-11-19", to: "2026-11-22" }],
				seenByStaff: [{ from: "2026-11-19", to: "2026-11-22" }],
				handChanges: 3,
			},
		},
		{
			// Touching parts read as one run of days; only the withdrawn one was seen.
			case: "a week holding a never-published part and a withdrawn one",
			plan: planOf(
				weekOf16({
					redone: [
						partOf("2026-11-16", "2026-11-17", { handChangedDays: 1 }),
						partOf("2026-11-18", "2026-11-22", {
							...WITHDRAWN,
							handChangedDays: 2,
						}),
					],
				})
			),
			expected: {
				days: [{ from: "2026-11-16", to: "2026-11-22" }],
				seenByStaff: [{ from: "2026-11-18", to: "2026-11-22" }],
				handChanges: 3,
			},
		},
		{
			// Days after the new days are worked out again too, so their roster is replaced.
			case: "only rest days after the new days",
			plan: planOf(
				weekOf16({ rest: [partOf("2026-11-20", "2026-11-22", WITHDRAWN)] })
			),
			expected: {
				days: [{ from: "2026-11-20", to: "2026-11-22" }],
				seenByStaff: [{ from: "2026-11-20", to: "2026-11-22" }],
				handChanges: 0,
			},
		},
		{
			case: "redone days and rest days with a gap between them",
			plan: planOf(
				weekOf16({
					redone: [partOf("2026-11-16", "2026-11-17")],
					rest: [partOf("2026-11-20", "2026-11-22")],
				})
			),
			expected: {
				days: [
					{ from: "2026-11-16", to: "2026-11-17" },
					{ from: "2026-11-20", to: "2026-11-22" },
				],
				seenByStaff: [],
				handChanges: 0,
			},
		},
		{
			// A Sunday and the Monday after it touch, so two weeks read as one run.
			case: "two weeks in a row",
			plan: planOf(weekOf16({ redone: [partOf("2026-11-19", "2026-11-22")] }), {
				...weekOf16({ redone: [partOf("2026-11-23", "2026-11-25")] }),
				periodStart: "2026-11-23",
				periodEnd: "2026-11-29",
			}),
			expected: {
				days: [{ from: "2026-11-19", to: "2026-11-25" }],
				seenByStaff: [],
				handChanges: 0,
			},
		},
		{
			case: "published days that stay beside a roster to review",
			plan: planOf(
				weekOf16({
					kept: [
						partOf("2026-11-16", "2026-11-17", {
							state: "PUBLISHED",
							publishedOnce: true,
						}),
					],
					redone: [partOf("2026-11-18", "2026-11-22")],
				})
			),
			expected: {
				days: [{ from: "2026-11-18", to: "2026-11-22" }],
				seenByStaff: [],
				handChanges: 0,
			},
		},
		{
			// A failed or never-generated part holds no roster, so nothing of it is replaced.
			case: "a part with no roster",
			plan: planOf(
				weekOf16({
					redone: [
						partOf("2026-11-16", "2026-11-22", {
							state: "FAILED",
							handChangedDays: null,
						}),
					],
				})
			),
			expected: undefined,
		},
		{
			case: "a rejected roster",
			plan: planOf(
				weekOf16({
					redone: [partOf("2026-11-16", "2026-11-22", { state: "REJECTED" })],
				})
			),
			expected: {
				days: [{ from: "2026-11-16", to: "2026-11-22" }],
				seenByStaff: [],
				handChanges: 0,
			},
		},
	])("given_$case_when_read_then_saysWhatIsReplaced", ({ plan, expected }) => {
		expect(replacedDaysOf(plan)).toEqual(expected);
	});
});
