import { describe, expect, it } from "vitest";
import type {
	ScheduleMonthSummary,
	WeekPart,
	WeekState,
} from "@/features/scheduling/months/api";
import {
	DAY_STRIP_LENGTH,
	dayMarkOf,
	departmentCards,
	type DepartmentCardEntry,
} from "@/features/scheduling/schedules/departmentCards";

const frontDesk = { departmentId: "dept-1", name: "Front Desk" };
const security = { departmentId: "dept-2", name: "Security" };

/** Wednesday: its week starts on Monday 16 November 2026. */
const TODAY = "2026-11-18";

/** A live schedule of a week, by its days. */
const part = (
	name: string,
	coveredFrom: string,
	coveredTo: string,
	state: WeekState
): WeekPart => ({
	scheduleId: `schedule-${name}`,
	name,
	named: true,
	coveredFrom,
	coveredTo,
	state,
	redoing: false,
});

/** Front Desk's November with the given weeks, each a Monday and its parts. */
const november = (
	weeks: Array<[string, Array<WeekPart>]>
): ScheduleMonthSummary => ({
	month: "2026-11",
	departmentId: frontDesk.departmentId,
	departmentName: frontDesk.name,
	branchId: "branch-1",
	branchName: "Main",
	weeks: weeks.map(([periodStart, parts]) => ({
		periodStart,
		state: parts[parts.length - 1]?.state ?? "NOT_GENERATED",
		scheduleId: parts[parts.length - 1]?.scheduleId ?? null,
		parts,
	})),
});

/** The only card for Front Desk. */
const frontDeskCard = (
	summaries: Array<ScheduleMonthSummary>
): DepartmentCardEntry | undefined =>
	departmentCards([frontDesk], summaries, TODAY)[0];

describe("departmentCards", () => {
	it("gives every Department a card, one with no schedule an empty one", () => {
		const [, empty] = departmentCards([frontDesk, security], [], TODAY);
		expect(empty).toMatchObject({
			departmentName: "Security",
			publishedUpTo: undefined,
			toReviewCount: 0,
			scheduledUpTo: undefined,
			nextToReview: undefined,
		});
		expect(empty?.dayStrip).toHaveLength(DAY_STRIP_LENGTH);
		expect(empty?.dayStrip.every((day) => day.mark === "none")).toBe(true);
	});

	it.each([
		{
			case: "a published week from Monday runs to its Sunday",
			parts: [part("Week", "2026-11-16", "2026-11-22", "PUBLISHED")],
			publishedUpTo: "2026-11-22",
		},
		{
			case: "a published run stops at the first day not published",
			parts: [
				part("Early", "2026-11-16", "2026-11-19", "PUBLISHED"),
				part("Late", "2026-11-20", "2026-11-22", "TO_REVIEW"),
			],
			publishedUpTo: "2026-11-19",
		},
		{
			case: "nothing published on Monday is nothing published",
			parts: [part("Late", "2026-11-17", "2026-11-22", "PUBLISHED")],
			publishedUpTo: undefined,
		},
	])("publishedUpTo: $case", ({ parts, publishedUpTo }) => {
		expect(
			frontDeskCard([november([["2026-11-16", parts]])])?.publishedUpTo
		).toBe(publishedUpTo);
	});

	it.each([
		{
			case: "a published run from this week says how far",
			weeks: [
				["2026-11-16", [part("Now", "2026-11-16", "2026-11-22", "PUBLISHED")]],
			],
			standing: "upTo",
		},
		{
			case: "a schedule published later, none from this week, is not published from this week",
			weeks: [
				["2026-11-16", [part("Now", "2026-11-16", "2026-11-22", "TO_REVIEW")]],
				[
					"2026-11-30",
					[part("Later", "2026-11-30", "2026-12-06", "PUBLISHED")],
				],
			],
			standing: "notFromThisWeek",
		},
		{
			case: "no schedule published anywhere is nothing published",
			weeks: [
				["2026-11-16", [part("Now", "2026-11-16", "2026-11-22", "TO_REVIEW")]],
			],
			standing: "nothing",
		},
	] as const)("publishedStanding: $case", ({ weeks, standing }) => {
		const summary = november(
			weeks.map(([monday, parts]) => [monday, [...parts]])
		);
		expect(frontDeskCard([summary])?.publishedStanding).toBe(standing);
	});

	it("counts the schedules to review and names the first in day order", () => {
		const card = frontDeskCard([
			november([
				[
					"2026-11-16",
					[part("Week 47", "2026-11-16", "2026-11-22", "TO_REVIEW")],
				],
				[
					"2026-11-23",
					[part("Week 48", "2026-11-23", "2026-11-25", "TO_REVIEW")],
				],
			]),
		]);
		expect(card).toMatchObject({
			toReviewCount: 2,
			nextToReview: "Week 47",
			scheduledUpTo: "2026-11-25",
		});
	});

	it("marks each strip day from today by the schedule holding it", () => {
		const card = frontDeskCard([
			november([
				[
					"2026-11-16",
					[
						part("Published", "2026-11-16", "2026-11-18", "PUBLISHED"),
						part("Review", "2026-11-19", "2026-11-20", "TO_REVIEW"),
					],
				],
			]),
		]);
		expect(card?.dayStrip.slice(0, 4)).toEqual([
			{ day: "2026-11-18", mark: "published" },
			{ day: "2026-11-19", mark: "toReview" },
			{ day: "2026-11-20", mark: "toReview" },
			{ day: "2026-11-21", mark: "none" },
		]);
	});

	it("reads an older API's week without parts as one schedule over the week", () => {
		const summary: ScheduleMonthSummary = {
			...november([]),
			weeks: [
				{ periodStart: "2026-11-16", state: "PUBLISHED", scheduleId: "s-1" },
			],
		};
		expect(frontDeskCard([summary])).toMatchObject({
			publishedUpTo: "2026-11-22",
			scheduledUpTo: "2026-11-22",
		});
	});
});

describe("dayMarkOf", () => {
	it.each([
		{ state: "PUBLISHED", mark: "published" },
		{ state: "TO_REVIEW", mark: "toReview" },
		{ state: "DRAFT", mark: "none" },
		{ state: "GENERATING", mark: "none" },
		{ state: undefined, mark: "none" },
	] as const)("$state is $mark", ({ state, mark }) => {
		expect(dayMarkOf(state)).toBe(mark);
	});
});
