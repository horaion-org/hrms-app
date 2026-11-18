import { describe, expect, it } from "vitest";
import {
	awaitingPublication,
	branchWeekFrom,
	daysWithoutSchedule,
	firstFreeRunOf,
	generatingNoticeShown,
	isDimmed,
	isGeneratingIn,
	laneCellsOf,
	lanesOf,
	type NeedLine,
	needsOf,
	scheduleOfDay,
	shiftWindow,
	shownScheduleIn,
	timelineScheduleLink,
	type TimelineSchedule,
	windowDays,
} from "@/features/scheduling/timeline/timeline";

/** A published schedule over the given days. */
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

const early = schedule("early", "2027-02-08", "2027-02-10");
const late = schedule("late", "2027-02-12", "2027-02-14");
const overlapping = schedule("overlapping", "2027-02-09", "2027-02-13");
const outside = schedule("outside", "2027-03-01", "2027-03-07");

describe("windowDays", () => {
	it.each([
		["week", 7, "2027-02-14"],
		["two", 14, "2027-02-21"],
		["four", 28, "2027-03-07"],
	] as const)("%s shows %i days ending %s", (view, count, lastDay) => {
		const days = windowDays("2027-02-08", view);
		expect(days).toHaveLength(count);
		expect(days[0]).toBe("2027-02-08");
		expect(days[days.length - 1]).toBe(lastDay);
	});
});

describe("shiftWindow", () => {
	it.each([
		["week", 1, "2027-02-15"],
		["week", -1, "2027-02-01"],
		["four", 1, "2027-03-08"],
	] as const)("%s by %i starts %s", (view, step, expected) => {
		expect(shiftWindow("2027-02-08", view, step)).toBe(expected);
	});
});

describe("lanesOf", () => {
	it.each([
		[
			"schedules that do not overlap share a lane",
			[late, early],
			[["early", "late"]],
		],
		[
			"an overlapping schedule takes a lane of its own",
			[early, overlapping, late],
			[["early", "late"], ["overlapping"]],
		],
		[
			"a schedule outside the window is left out",
			[early, outside],
			[["early"]],
		],
		["no schedules give no lanes", [], []],
	] as const)("%s", (_, schedules, expected) => {
		const lanes = lanesOf(schedules, "2027-02-08", "2027-02-14");
		expect(lanes.map((lane) => lane.map(({ id }) => id))).toEqual(expected);
	});
});

describe("scheduleOfDay", () => {
	it.each([
		["2027-02-08", "early"],
		["2027-02-10", "early"],
		["2027-02-11", undefined],
	])("%s belongs to %s", (day, expected) => {
		expect(scheduleOfDay([early, late], day)?.id).toBe(expected);
	});
});

describe("daysWithoutSchedule", () => {
	it.each([
		[
			"a day between two schedules",
			[early, late],
			[{ firstDay: "2027-02-11", lastDay: "2027-02-11" }],
		],
		[
			"the whole window without schedules",
			[],
			[{ firstDay: "2027-02-08", lastDay: "2027-02-14" }],
		],
		["a fully covered window", [early, overlapping, late], []],
	] as const)("%s", (_, schedules, expected) => {
		expect(daysWithoutSchedule(schedules, "2027-02-08", "2027-02-14")).toEqual(
			expected
		);
	});
});

describe("needsOf", () => {
	const window = { firstDay: "2027-02-08", lastDay: "2027-02-14" };
	const toReview = (id: string, firstDay: string): TimelineSchedule =>
		schedule(id, firstDay, firstDay, "TO_REVIEW");

	it("lists the days to review, then the open days from today", () => {
		expect(
			needsOf([early, toReview("r1", "2027-02-12")], window, "2027-02-09")
		).toEqual([
			{
				kind: "toReview",
				firstDay: "2027-02-12",
				lastDay: "2027-02-12",
				scheduleIds: ["r1"],
			},
			{
				kind: "noSchedule",
				schedulable: true,
				firstDay: "2027-02-11",
				lastDay: "2027-02-11",
			},
			{
				kind: "noSchedule",
				schedulable: true,
				firstDay: "2027-02-13",
				lastDay: "2027-02-14",
			},
		]);
	});

	/** Adjacent schedules to review read as one run of days; a run apart from it is its own line. */
	it("joins adjacent schedules to review into one line of days", () => {
		const reviews = [
			toReview("r1", "2027-02-08"),
			toReview("r2", "2027-02-09"),
			toReview("r3", "2027-02-11"),
		];
		expect(needsOf([...reviews, late], window, "2027-02-01")).toEqual([
			{
				kind: "toReview",
				firstDay: "2027-02-08",
				lastDay: "2027-02-09",
				scheduleIds: ["r1", "r2"],
			},
			{
				kind: "toReview",
				firstDay: "2027-02-11",
				lastDay: "2027-02-11",
				scheduleIds: ["r3"],
			},
			{
				kind: "noSchedule",
				schedulable: false, // Before the published weekend part.
				firstDay: "2027-02-10",
				lastDay: "2027-02-10",
			},
		]);
	});

	it("leaves out days before today", () => {
		expect(needsOf([], window, "2027-02-13")).toEqual([
			{
				kind: "noSchedule",
				schedulable: true,
				firstDay: "2027-02-13",
				lastDay: "2027-02-14",
			},
		]);
	});
});

describe("isGeneratingIn", () => {
	const run = { firstDay: "2027-02-10", lastDay: "2027-02-12" };
	const generating = (firstDay: string, lastDay: string): TimelineSchedule =>
		schedule("redo", firstDay, lastDay, "GENERATING");

	it.each([
		["no schedule", [], false],
		["only schedules not being generated", [early, late], false],
		[
			"one being generated on its last day",
			[generating("2027-02-12", "2027-02-14")],
			true,
		],
		[
			"one being generated on other days",
			[early, generating("2027-02-13", "2027-02-14")],
			false,
		],
	] as const)("with %s over the run: %s", (_, schedules, expected) => {
		expect(isGeneratingIn(schedules, run)).toBe(expected);
	});
});

describe("generatingNoticeShown", () => {
	/** The notice outlives the moment before the month read shows the run, and goes once generating was seen to end. */
	it.each([
		["nothing generating yet, none seen", false, false, true],
		["generating now", true, true, true],
		["generating seen, and over", false, true, false],
	])("%s: %s", (_, generatingNow, seenGenerating, shown) => {
		expect(generatingNoticeShown(generatingNow, seenGenerating)).toBe(shown);
	});
});

describe("firstFreeRunOf", () => {
	const review: NeedLine = {
		kind: "toReview",
		firstDay: "2027-02-08",
		lastDay: "2027-02-09",
		scheduleIds: ["r1"],
	};
	const blocked: NeedLine = {
		kind: "noSchedule",
		schedulable: false,
		firstDay: "2027-02-10",
		lastDay: "2027-02-10",
	};
	const free: NeedLine = {
		kind: "noSchedule",
		schedulable: true,
		firstDay: "2027-02-13",
		lastDay: "2027-02-14",
	};
	const laterFree: NeedLine = {
		...free,
		firstDay: "2027-02-20",
		lastDay: "2027-02-21",
	};

	/** Only days the API lets be scheduled are offered; days to review and days before a published part are not. */
	it.each([
		["no line", [], undefined],
		["only days to review", [review], undefined],
		["only days that can't be scheduled", [blocked], undefined],
		[
			"the first free run after other lines",
			[review, blocked, free, laterFree],
			{ firstDay: "2027-02-13", lastDay: "2027-02-14" },
		],
	] as const)("gives %s", (_, lines, expected) => {
		expect(firstFreeRunOf(lines)).toEqual(expected);
	});
});

describe("laneCellsOf", () => {
	const week = windowDays("2027-02-08", "week");
	/** Each cell as "bar <id> <span>" or "gap <first day> <span>". */
	const shapeOf = (lane: Array<TimelineSchedule>): Array<string> =>
		laneCellsOf(lane, week).map((cell) =>
			cell.kind === "bar"
				? `bar ${cell.schedule.id} ${cell.span}`
				: `gap ${cell.firstDay} ${cell.span}`
		);

	it.each([
		[
			"two bars around a day without a schedule",
			[early, late],
			["bar early 3", "gap 2027-02-11 1", "bar late 3"],
		],
		[
			"a bar clipped to the window",
			[schedule("long", "2027-02-01", "2027-02-09")],
			["bar long 2", "gap 2027-02-10 5"],
		],
		["an empty lane", [], ["gap 2027-02-08 7"]],
	] as const)("%s", (_, lane, expected) => {
		expect(shapeOf([...lane])).toEqual(expected);
	});
});

describe("isDimmed", () => {
	it.each([
		["s-1", undefined, false],
		["s-1", "s-1", false],
		["s-2", "s-1", true],
	])("%s with %s shown alone is dimmed: %s", (scheduleId, shown, expected) => {
		expect(isDimmed(scheduleId, shown)).toBe(expected);
	});
});

describe("shownScheduleIn", () => {
	it.each([
		["a schedule in the window", "early", "early"],
		["a schedule not in the window", "gone", undefined],
		["no schedule", undefined, undefined],
	])("%s", (_, scheduleId, expected) => {
		expect(shownScheduleIn([early, late], scheduleId)).toBe(expected);
	});
});

describe("needsOf: days before a published part", () => {
	const window = { firstDay: "2027-02-08", lastDay: "2027-02-14" };
	const toReviewEarly = schedule(
		"review",
		"2027-02-08",
		"2027-02-10",
		"TO_REVIEW"
	);
	const withdrawn: TimelineSchedule = {
		...schedule("withdrawn", "2027-02-12", "2027-02-14", "TO_REVIEW"),
		publishedOnce: true,
	};

	/** Thursday lies before Friday's published (or once-published) part of the same week: not schedulable. */
	it.each([
		["a published part after it", [toReviewEarly, late], false],
		["a part published once after it", [toReviewEarly, withdrawn], false],
		[
			"only a part to review after it",
			[
				toReviewEarly,
				schedule("next", "2027-02-12", "2027-02-14", "TO_REVIEW"),
			],
			true,
		],
	] as const)(
		"Thursday with %s is schedulable: %s",
		(_, schedules, expected) => {
			const gaps = needsOf([...schedules], window, "2027-02-08").filter(
				(line) => line.kind === "noSchedule"
			);
			expect(gaps).toEqual([
				{
					kind: "noSchedule",
					schedulable: expected,
					firstDay: "2027-02-11",
					lastDay: "2027-02-11",
				},
			]);
		}
	);

	it("splits a run where it stops being before a published part", () => {
		const lines = needsOf(
			[schedule("weekend", "2027-02-13", "2027-02-14")],
			{ firstDay: "2027-02-08", lastDay: "2027-02-21" },
			"2027-02-08"
		);
		expect(lines).toEqual([
			{
				kind: "noSchedule",
				schedulable: false,
				firstDay: "2027-02-08",
				lastDay: "2027-02-12",
			},
			{
				kind: "noSchedule",
				schedulable: true,
				firstDay: "2027-02-15",
				lastDay: "2027-02-21",
			},
		]);
	});
});

describe("awaitingPublication", () => {
	it.each([
		["TO_REVIEW", true],
		["GENERATING", true],
		["DRAFT", true],
		["PUBLISHED", false],
		["FAILED", false],
		["REJECTED", false],
		["NOT_GENERATED", false],
	] as const)("names a %s schedule: %s", (status, named) => {
		const one = schedule("one", "2027-02-08", "2027-02-10", status);
		expect(awaitingPublication([one])).toEqual(named ? [one] : []);
	});
});

describe("timelineScheduleLink", () => {
	it.each([
		[
			"DRAFT",
			{
				to: "/scheduling/new",
				search: { step: "setup", scheduleId: "one", departmentId: "d-1" },
			},
		],
		[
			"TO_REVIEW",
			{ to: "/scheduling/$scheduleId", params: { scheduleId: "one" } },
		],
		[
			"FAILED",
			{ to: "/scheduling/$scheduleId", params: { scheduleId: "one" } },
		],
	] as const)("opens a %s schedule at %j", (status, expected) => {
		const one = schedule("one", "2027-02-08", "2027-02-10", status);
		expect(timelineScheduleLink(one, "d-1")).toEqual(expected);
	});
});

describe("branchWeekFrom", () => {
	it.each([
		["a from in the URL", "2027-02-01", "2027-02-08", "2027-02-15", undefined],
		[
			"the branch's week already shown",
			undefined,
			"2027-02-08",
			"2027-02-10",
			undefined,
		],
		[
			"the branch already in next week",
			undefined,
			"2027-02-08",
			"2027-02-15",
			"2027-02-15",
		],
		[
			"the branch still in last week",
			undefined,
			"2027-02-08",
			"2027-02-07",
			"2027-02-01",
		],
	])("%s", (_, from, shownFirstDay, branchToday, expected) => {
		expect(branchWeekFrom(from, shownFirstDay, branchToday)).toBe(expected);
	});
});
