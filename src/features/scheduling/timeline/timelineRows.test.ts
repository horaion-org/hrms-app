import { describe, expect, it } from "vitest";
import {
	monthWeekFixture,
	scheduleMonthFixture,
	twoPartWeekFixture,
} from "@/features/scheduling/months/fixtures";
import type { ScheduleMonth } from "@/features/scheduling/months/api";
import type { RosterRow } from "@/features/scheduling/roster/roster";
import {
	generatedScheduleFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";
import { timelineRowFixture } from "@/features/scheduling/timeline/fixtures";
import {
	coveredDaysBehind,
	hoursOfRow,
	monthsOfWindow,
	piecesOf,
	rosterAwaited,
	rostersReadOf,
	scheduleReadPolls,
	weekPartsOf,
	timelinePiecesOf,
	timelineRowsOf,
	timelineSchedulesOf,
} from "@/features/scheduling/timeline/timelineRows";

/** A row of one person with a day off on each of the given days. */
const rowWithDaysOff = (key: string, days: Array<string>): RosterRow => ({
	key,
	membershipId: key,
	name: `Person ${key}`,
	jobTitle: "Cook",
	employeeCode: null,
	days: Object.fromEntries(
		days.map((day) => [day, { kind: "absent" as const }])
	),
});

describe("monthsOfWindow", () => {
	it.each([
		["2027-02-08", "2027-02-14", ["2027-02"]],
		["2027-02-22", "2027-03-07", ["2027-02", "2027-03"]],
		["2026-12-28", "2027-01-24", ["2026-12", "2027-01"]],
	])("%s to %s reads %j", (firstDay, lastDay, expected) => {
		expect(monthsOfWindow(firstDay, lastDay)).toEqual(expected);
	});
});

describe("timelineSchedulesOf", () => {
	it("gives each part once, with its days and state", () => {
		const month = scheduleMonthFixture({
			weeks: [monthWeekFixture({ parts: twoPartWeekFixture() })],
		});
		expect(timelineSchedulesOf([month])).toEqual([
			{
				id: "s-1",
				name: "Week of 2027-02-15",
				status: "TO_REVIEW",
				publishedOnce: false,
				firstDay: "2027-02-17",
				lastDay: "2027-02-19",
			},
			{
				id: "s-2",
				name: "Week of 2027-02-15",
				status: "TO_REVIEW",
				publishedOnce: false,
				firstDay: "2027-02-20",
				lastDay: "2027-02-21",
			},
		]);
	});

	it("spans a schedule seen in two months from its first day to its last", () => {
		const [part] = twoPartWeekFixture();
		const monthWith = (coveredFrom: string, coveredTo: string): ScheduleMonth =>
			scheduleMonthFixture({
				weeks: [
					monthWeekFixture({ parts: [{ ...part!, coveredFrom, coveredTo }] }),
				],
			});
		const [schedule] = timelineSchedulesOf([
			monthWith("2027-02-25", "2027-02-28"),
			monthWith("2027-03-01", "2027-03-03"),
		]);
		expect(schedule).toMatchObject({
			firstDay: "2027-02-25",
			lastDay: "2027-03-03",
		});
	});
});

describe("timelineRowsOf", () => {
	it("merges a person's days from two schedules into one row, each day naming its schedule", () => {
		const rows = timelineRowsOf([
			{ scheduleId: "s-1", rows: [rowWithDaysOff("m-1", ["2027-02-08"])] },
			{
				scheduleId: "s-2",
				rows: [
					rowWithDaysOff("m-1", ["2027-02-12"]),
					rowWithDaysOff("m-2", ["2027-02-12"]),
				],
			},
		]);
		expect(rows.map((row) => row.key)).toEqual(["m-1", "m-2"]);
		expect(rows[0]!.days["2027-02-08"]?.scheduleId).toBe("s-1");
		expect(rows[0]!.days["2027-02-12"]?.scheduleId).toBe("s-2");
		expect(Object.keys(rows[1]!.days)).toEqual(["2027-02-12"]);
	});

	it("gives no rows without rosters", () => {
		expect(timelineRowsOf([])).toEqual([]);
	});
});

describe("hoursOfRow", () => {
	it.each([
		["the whole week, two eight-hour shifts", ["2027-02-08", "2027-02-12"], 16],
		["one day of the two", ["2027-02-08"], 8],
		["days without a shift", ["2027-02-09"], 0],
	])("%s", (_, days, expected) => {
		expect(hoursOfRow(timelineRowFixture(), days)).toBe(expected);
	});
});

describe("rostersReadOf", () => {
	it.each([
		[["done", "done"], "loaded"],
		[["done", "pending"], "loading"],
		[["pending", "failed"], "failed"],
		[[], "loaded"],
	] as const)("%j reads as %s", (steps, expected) => {
		expect(rostersReadOf(steps)).toBe(expected);
	});
});

describe("weekPartsOf", () => {
	const month = scheduleMonthFixture({
		weeks: [
			monthWeekFixture({
				periodStart: "2027-02-15",
				parts: twoPartWeekFixture(),
			}),
		],
	});
	it.each([
		["a week read", "2027-02-15", 2],
		["a week not read", "2027-02-22", 0],
	])("%s", (_, periodStart, count) => {
		expect(weekPartsOf([month], periodStart)).toHaveLength(count);
	});
});

describe("timelinePiecesOf", () => {
	const february = scheduleMonthFixture({
		month: "2027-02",
		weeks: [
			monthWeekFixture({
				periodStart: "2027-02-15",
				parts: twoPartWeekFixture(),
			}),
		],
	});
	const inFebruary = scheduleFixture({
		scheduleId: "s-read",
		periodStart: "2027-02-15",
		periodEnd: "2027-02-21",
	});
	const inMarch = scheduleFixture({
		scheduleId: "s-march",
		periodStart: "2027-03-01",
		periodEnd: "2027-03-07",
	});

	/** A schedule whose month is not read yet is still a piece, with no parts and no month. */
	it("gives each schedule its week's parts and its month, by id", () => {
		expect(timelinePiecesOf([inFebruary, inMarch], [february])).toEqual({
			"s-read": {
				schedule: inFebruary,
				weekParts: twoPartWeekFixture(),
				month: february,
			},
			"s-march": { schedule: inMarch, weekParts: [], month: undefined },
		});
	});

	/** A schedule named twice (its days split by a redo) is listed once; one not read yet is left out. */
	it("picks the pieces read among the ids, once each and in order", () => {
		const pieces = timelinePiecesOf([inFebruary, inMarch], [february]);
		expect(
			piecesOf(pieces, ["s-march", "s-unread", "s-read", "s-march"]).map(
				(piece) => piece.schedule.scheduleId
			)
		).toEqual(["s-march", "s-read"]);
	});
});

describe("a schedule's read against the month's word", () => {
	const queued = scheduleFixture();
	const requested = generatedScheduleFixture();
	const generated = generatedScheduleFixture({ status: "GENERATED" });
	const published = generatedScheduleFixture({ status: "PUBLISHED" });

	/**
	 * A piece queued behind another is read before its generation starts; once
	 * the month says it has a roster that read is behind, and is made again.
	 */
	it.each([
		["GENERATING", "not read yet", undefined, false, true],
		["GENERATING", "read while queued", queued, false, true],
		["GENERATING", "read while requested", requested, false, true],
		["TO_REVIEW", "not read yet", undefined, false, false],
		["TO_REVIEW", "read while queued", queued, true, true],
		["TO_REVIEW", "read while requested", requested, true, true],
		["TO_REVIEW", "read as generated", generated, false, false],
		["PUBLISHED", "read as published", published, false, false],
		["DRAFT", "read as a draft", queued, false, false],
		["FAILED", "read while requested", requested, false, true],
		["NOT_GENERATED", "not read yet", undefined, false, false],
	] as const)(
		"the month saying %s, the schedule %s: awaits its roster %s, is read again %s",
		(state, _, read, awaited, polls) => {
			expect(rosterAwaited(state, read)).toBe(awaited);
			expect(scheduleReadPolls(state, read)).toBe(polls);
		}
	);
});

describe("coveredDaysBehind", () => {
	const wholeWeek = generatedScheduleFixture({ status: "GENERATED" });
	const listedWhole = { firstDay: "2026-10-12", lastDay: "2026-10-18" };

	/** A later run took Wednesday on: the month lists Monday and Tuesday while the read still covers the week. */
	it.each([
		["not read yet", listedWhole, undefined, false],
		["a read covering the days listed", listedWhole, wholeWeek, false],
		[
			"a read covering more days than listed",
			{ firstDay: "2026-10-12", lastDay: "2026-10-13" },
			wholeWeek,
			true,
		],
		[
			"a read starting on another day than listed",
			{ firstDay: "2026-10-14", lastDay: "2026-10-18" },
			wholeWeek,
			true,
		],
	])("%s is behind: %s", (_, listed, read, expected) => {
		expect(coveredDaysBehind(listed, read)).toBe(expected);
	});
});
