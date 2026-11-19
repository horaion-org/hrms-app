import { describe, expect, it } from "vitest";
import type {
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";
import {
	enteredNightCell,
	unknownCell,
} from "@/features/scheduling/startingContext/fixtures";
import type { EnteredWhat } from "@/features/scheduling/startingContext/enteredDays";
import {
	type EnteredCell,
	enteredCellsOf,
	schedulesWithFreeDaysBefore,
	withEnteredCells,
} from "@/features/scheduling/timeline/enteredCells";
import {
	FIXTURE_WEEK,
	timelineRowFixture,
	twoTimelineSchedules,
} from "@/features/scheduling/timeline/fixtures";
import type { TimelineSchedule } from "@/features/scheduling/timeline/timeline";

const WEDNESDAY = "2027-02-10";
const THURSDAY = "2027-02-11";

const NIGHT: EnteredWhat = {
	kind: "shift",
	name: "Night",
	start: "22:00",
	end: "06:00",
};
const DAY_OFF: EnteredWhat = { kind: "off", dayType: null };

/** A schedule of the given days, to review. */
const scheduleOf = (
	id: string,
	firstDay: string,
	lastDay: string
): TimelineSchedule => ({
	id,
	name: id,
	firstDay,
	lastDay,
	status: "TO_REVIEW",
	publishedOnce: false,
});

/** A day off a scheduler entered, without a type. */
const enteredOffCell = (date: string): StartingCell => ({
	...unknownCell(date),
	kind: "OFF",
	source: "ENTERED",
});

/** A run's starting days holding only the given cells, each for one person by profile and name. */
const startingDaysWith = (
	people: Array<{ profile: string; name: string; cells: Array<StartingCell> }>
): StartingDays => ({
	days: [],
	previousRoster: null,
	shifts: [],
	members: people.map(({ profile, name, cells }) => ({
		memberProfileId: profile,
		displayName: name,
		jobTitleName: "Cook",
		cells,
	})),
});

/** Aisha with the given entered cells before a run. */
const aishaWith = (...cells: Array<StartingCell>): StartingDays =>
	startingDaysWith([{ profile: "mp-1", name: "Aisha Rahman", cells }]);

describe("schedulesWithFreeDaysBefore", () => {
	it.each([
		[
			"Thursday free before the weekend run",
			twoTimelineSchedules(),
			FIXTURE_WEEK,
			["s-late"],
		],
		[
			"a schedule on every day",
			[
				scheduleOf("s-early", "2027-02-08", THURSDAY),
				scheduleOf("s-late", "2027-02-12", "2027-02-14"),
			],
			FIXTURE_WEEK,
			[],
		],
		[
			"a free day 14 days before the run",
			[scheduleOf("s-late", "2027-02-12", "2027-02-14")],
			["2027-01-29"],
			["s-late"],
		],
		[
			"a free day 15 days before the run",
			[scheduleOf("s-late", "2027-02-12", "2027-02-14")],
			["2027-01-28"],
			[],
		],
		[
			"a free day after the run",
			[scheduleOf("s-late", "2027-02-12", "2027-02-14")],
			["2027-02-15"],
			[],
		],
	])("reads the runs with %s", (_name, schedules, days, expected) => {
		expect(
			schedulesWithFreeDaysBefore(schedules, days).map(
				(schedule) => schedule.id
			)
		).toEqual(expected);
	});
});

describe("enteredCellsOf", () => {
	const aishaThursday = {
		memberProfileId: "mp-1",
		name: "Aisha Rahman",
		jobTitle: "Cook",
		date: THURSDAY,
		what: NIGHT,
		scheduleId: "s-late",
	};

	it.each([
		[
			"an entered day on a day no schedule covers, naming its run",
			twoTimelineSchedules(),
			{ "s-late": aishaWith(enteredNightCell(THURSDAY)) },
			[aishaThursday],
		],
		// Wednesday belongs to the early schedule: its roster is never overridden.
		[
			"nothing on a day a schedule covers",
			twoTimelineSchedules(),
			{ "s-late": aishaWith(enteredNightCell(WEDNESDAY)) },
			[],
		],
		[
			"nothing for a day outside the window",
			twoTimelineSchedules(),
			{ "s-late": aishaWith(enteredNightCell("2027-02-05")) },
			[],
		],
		["nothing for a run not read", twoTimelineSchedules(), {}, []],
		// Both runs hold Aisha's Thursday; the weekend run starts the day after it, so its Night is kept.
		[
			"the day of the run starting soonest after it",
			[
				scheduleOf("s-next", "2027-02-15", "2027-02-21"),
				...twoTimelineSchedules(),
			],
			{
				"s-next": aishaWith(enteredOffCell(THURSDAY)),
				"s-late": aishaWith(enteredNightCell(THURSDAY)),
			},
			[aishaThursday],
		],
	])("gives %s", (_name, schedules, startingDaysOf, expected) => {
		expect(enteredCellsOf(schedules, startingDaysOf, FIXTURE_WEEK)).toEqual(
			expected
		);
	});
});

describe("withEnteredCells", () => {
	const aisha = { ...timelineRowFixture(), memberProfileId: "mp-1" };
	/** The given person's Thursday entered as a day off before the weekend run. */
	const entered = (memberProfileId: string, name: string): EnteredCell => ({
		memberProfileId,
		name,
		jobTitle: "Cook",
		date: THURSDAY,
		what: DAY_OFF,
		scheduleId: "s-late",
	});

	it("puts an entered day on its person's row and leaves the rostered days as they are", () => {
		const [row] = withEnteredCells([aisha], [entered("mp-1", "Aisha Rahman")]);
		expect(row!.entered).toEqual({
			[THURSDAY]: { what: DAY_OFF, scheduleId: "s-late" },
		});
		expect(row!.days).toEqual(aisha.days);
	});

	it("gives someone no roster has a row of their own, after the rostered rows", () => {
		const rows = withEnteredCells([aisha], [entered("mp-2", "Ben Ong")]);
		expect(rows.map((row) => row.name)).toEqual(["Aisha Rahman", "Ben Ong"]);
		expect(rows[0]).toBe(aisha);
		expect(rows[1]).toEqual({
			key: "mp-2",
			memberProfileId: "mp-2",
			name: "Ben Ong",
			jobTitle: "Cook",
			employeeCode: null,
			days: {},
			entered: { [THURSDAY]: { what: DAY_OFF, scheduleId: "s-late" } },
		});
	});

	it("leaves the rows as they are when nothing was entered", () => {
		expect(withEnteredCells([aisha], [])).toEqual([aisha]);
	});
});
