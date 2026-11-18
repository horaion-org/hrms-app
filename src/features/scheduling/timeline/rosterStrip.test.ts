import { describe, expect, it } from "vitest";
import { FIXTURE_WEEK } from "@/features/scheduling/timeline/fixtures";
import {
	daysOfRun,
	pieceOfDay,
	stripRunsOf,
	toReviewPiecesOf,
} from "@/features/scheduling/timeline/rosterStrip";
import type { TimelineSchedule } from "@/features/scheduling/timeline/timeline";

/** A schedule over the given days, published unless a status is given. */
const schedule = (
	id: string,
	firstDay: string,
	lastDay: string,
	status: TimelineSchedule["status"] = "PUBLISHED"
): TimelineSchedule => ({
	id,
	name: `Name ${id}`,
	firstDay,
	lastDay,
	status,
	publishedOnce: false,
});

const WEEK = { firstDay: "2027-02-08", lastDay: "2027-02-14" };
const NEXT_WEEK = { firstDay: "2027-02-15", lastDay: "2027-02-21" };
const thisWeek = schedule("this", WEEK.firstDay, WEEK.lastDay);
const nextWeek = schedule("next", NEXT_WEEK.firstDay, NEXT_WEEK.lastDay);
const earlyToReview = schedule(
	"early",
	"2027-02-08",
	"2027-02-10",
	"TO_REVIEW"
);

describe("daysOfRun", () => {
	it("lists every day from the first to the last", () => {
		expect(daysOfRun(WEEK)).toEqual(FIXTURE_WEEK);
	});
});

describe("pieceOfDay", () => {
	const toReview = schedule("review", "2027-02-08", "2027-02-14", "TO_REVIEW");
	const generating = schedule("redo", "2027-02-10", "2027-02-11", "GENERATING");
	const failed = schedule("failed", "2027-02-10", "2027-02-11", "FAILED");

	/** A part generated again over days to review holds those days while it runs, and after it failed. */
	it.each([
		["no schedule on the day", [toReview], "2027-02-15", undefined],
		["the one schedule covering it", [toReview], "2027-02-10", "review"],
		[
			"the one being generated over it",
			[toReview, failed, generating],
			"2027-02-10",
			"redo",
		],
		["the failed one over it", [toReview, failed], "2027-02-10", "failed"],
		[
			"the first where neither is a redo",
			[toReview, thisWeek],
			"2027-02-10",
			"review",
		],
	] as const)("gives %s", (_, schedules, day, expected) => {
		expect(pieceOfDay(schedules, day)?.id).toBe(expected);
	});
});

describe("stripRunsOf", () => {
	it("gives no run for an empty window", () => {
		expect(stripRunsOf([thisWeek], [])).toEqual([]);
	});

	it("gives one published week as one run with one piece", () => {
		expect(stripRunsOf([thisWeek], FIXTURE_WEEK)).toEqual([
			{
				state: "PUBLISHED",
				...WEEK,
				span: 7,
				pieces: [{ schedule: thisWeek, ...WEEK, span: 7 }],
			},
		]);
	});

	it("joins two adjacent published weeks into one run with two pieces", () => {
		const days = daysOfRun({
			firstDay: WEEK.firstDay,
			lastDay: NEXT_WEEK.lastDay,
		});
		expect(stripRunsOf([thisWeek, nextWeek], days)).toEqual([
			{
				state: "PUBLISHED",
				firstDay: WEEK.firstDay,
				lastDay: NEXT_WEEK.lastDay,
				span: 14,
				pieces: [
					{ schedule: thisWeek, ...WEEK, span: 7 },
					{ schedule: nextWeek, ...NEXT_WEEK, span: 7 },
				],
			},
		]);
	});

	it("follows days to review with the days that have no roster", () => {
		expect(stripRunsOf([earlyToReview], FIXTURE_WEEK)).toEqual([
			{
				state: "TO_REVIEW",
				firstDay: "2027-02-08",
				lastDay: "2027-02-10",
				span: 3,
				pieces: [
					{
						schedule: earlyToReview,
						firstDay: "2027-02-08",
						lastDay: "2027-02-10",
						span: 3,
					},
				],
			},
			{
				state: "NONE",
				firstDay: "2027-02-11",
				lastDay: "2027-02-14",
				span: 4,
				pieces: [],
			},
		]);
	});

	it("clips a piece that starts before the window to the days shown", () => {
		const acrossWeeks = schedule("across", "2027-02-04", "2027-02-09");
		const [run] = stripRunsOf([acrossWeeks], FIXTURE_WEEK);
		expect(run).toMatchObject({
			state: "PUBLISHED",
			firstDay: "2027-02-08",
			lastDay: "2027-02-09",
			span: 2,
			pieces: [
				{
					schedule: acrossWeeks,
					firstDay: "2027-02-08",
					lastDay: "2027-02-09",
					span: 2,
				},
			],
		});
	});

	/** Days being generated again split the days to review around them into two pieces of the same schedule. */
	it("shows days generated again over days to review as generating", () => {
		const toReview = schedule(
			"review",
			WEEK.firstDay,
			WEEK.lastDay,
			"TO_REVIEW"
		);
		const redo = schedule("redo", "2027-02-10", "2027-02-11", "GENERATING");
		expect(
			stripRunsOf([toReview, redo], FIXTURE_WEEK).map((run) => [
				run.state,
				run.span,
				run.pieces.map((piece) => piece.schedule.id),
			])
		).toEqual([
			["TO_REVIEW", 2, ["review"]],
			["GENERATING", 2, ["redo"]],
			["TO_REVIEW", 3, ["review"]],
		]);
	});

	/** Every state but "never generated" keeps its own word and its piece; never generated reads as no roster. */
	it.each([
		["FAILED", "FAILED", 1],
		["REJECTED", "REJECTED", 1],
		["DRAFT", "DRAFT", 1],
		["UNKNOWN", "UNKNOWN", 1],
		["NOT_GENERATED", "NONE", 0],
	] as const)(
		"reads a %s schedule as %s with %i piece",
		(status, state, pieces) => {
			const [run] = stripRunsOf(
				[schedule("one", WEEK.firstDay, WEEK.lastDay, status)],
				FIXTURE_WEEK
			);
			expect(run?.state).toBe(state);
			expect(run?.span).toBe(7);
			expect(run?.pieces).toHaveLength(pieces);
		}
	);
});

describe("toReviewPiecesOf", () => {
	it("lists the pieces to review touching the window, in day order", () => {
		const lateToReview = schedule(
			"late",
			"2027-02-13",
			"2027-02-17",
			"TO_REVIEW"
		);
		expect(toReviewPiecesOf([lateToReview, earlyToReview], WEEK)).toEqual([
			{
				schedule: earlyToReview,
				firstDay: "2027-02-08",
				lastDay: "2027-02-10",
				span: 3,
			},
			{
				schedule: lateToReview,
				firstDay: "2027-02-13",
				lastDay: "2027-02-14",
				span: 2,
			},
		]);
	});

	it("lists none where nothing is to review", () => {
		expect(toReviewPiecesOf([thisWeek], WEEK)).toEqual([]);
	});
});
