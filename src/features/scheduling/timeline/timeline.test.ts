import { describe, expect, it } from "vitest";
import {
	daysWithoutSchedule,
	laneCellsOf,
	lanesOf,
	needsOf,
	scheduleOfDay,
	shiftWindow,
	type TimelineSchedule,
	windowDays,
} from "@/features/scheduling/timeline/timeline";

/** A published schedule over the given days. */
const schedule = (
	id: string,
	firstDay: string,
	lastDay: string,
	status: TimelineSchedule["status"] = "PUBLISHED"
): TimelineSchedule => ({ id, name: `Name ${id}`, firstDay, lastDay, status });

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

	it("lists each of up to two schedules to review, then the open days from today", () => {
		expect(
			needsOf([early, toReview("r1", "2027-02-12")], window, "2027-02-09")
		).toEqual([
			{ kind: "reviewOne", scheduleId: "r1", name: "Name r1" },
			{ kind: "noSchedule", firstDay: "2027-02-11", lastDay: "2027-02-11" },
			{ kind: "noSchedule", firstDay: "2027-02-13", lastDay: "2027-02-14" },
		]);
	});

	it("names more than two schedules to review in one line", () => {
		const reviews = [
			toReview("r1", "2027-02-08"),
			toReview("r2", "2027-02-09"),
			toReview("r3", "2027-02-10"),
		];
		expect(needsOf([...reviews, late], window, "2027-02-01")).toEqual([
			{
				kind: "reviewMany",
				count: 3,
				names: ["Name r1", "Name r2", "Name r3"],
			},
			{ kind: "noSchedule", firstDay: "2027-02-11", lastDay: "2027-02-11" },
		]);
	});

	it("leaves out days before today", () => {
		expect(needsOf([], window, "2027-02-13")).toEqual([
			{ kind: "noSchedule", firstDay: "2027-02-13", lastDay: "2027-02-14" },
		]);
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
