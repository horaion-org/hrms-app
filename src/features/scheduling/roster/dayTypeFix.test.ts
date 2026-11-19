import { describe, expect, it } from "vitest";
import {
	cellsNotHeld,
	dayTypeRetypeGroups,
	dayTypeRetypeOf,
	dayTypeRetypes,
	neededDayTypeOf,
	retypeCells,
	type DayTypeFixSources,
	type DayTypeRetype,
} from "@/features/scheduling/roster/dayTypeFix";
import { rosterIssueFixture } from "@/features/scheduling/roster/rosterIssueFixtures";
import type { RosterIssue } from "@/features/scheduling/roster/rosterIssueGroups";
import { rosterCheckFixture } from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/** The week of Monday 12 October 2026, as the roster fixture has it. */
const MONDAY = "2026-10-12";
const FRIDAY = "2026-10-16";
const SATURDAY = "2026-10-17";
const SUNDAY = "2026-10-18";

const NON_WORKING_DAY_TYPES = ["OFF", "REST"];

/** A frozen weekly rule: `comparison` so many days of `dayTypes` each week. */
const weeklyRule = (
	constraintId: string,
	dayTypes: ReadonlyArray<string>,
	comparison = "AT_LEAST"
): DayTypeFixSources["constraints"][number] => ({
	constraintId,
	values: [
		{ field: "COMPARISON", value: comparison, name: null, problem: null },
		{ field: "DAY_TYPE_COUNT", value: "1", name: null, problem: null },
		...dayTypes.map((value) => ({
			field: "DAY_TYPE" as const,
			value,
			name: null,
			problem: null,
		})),
	],
});

const CONSTRAINTS = [
	weeklyRule("rest-copy", ["REST"]),
	weeklyRule("off-copy", ["OFF"]),
	weeklyRule("either-copy", ["REST", "OFF"]),
	weeklyRule("exactly-copy", ["REST"], "EXACTLY"),
];

/** Aisha Rahman's week: worked Monday to Friday, then the two days given, as day types or as they are. */
const aishaWeek = (
	changes: Record<string, Partial<ScheduleAssignment>> = {}
): Array<ScheduleAssignment> =>
	scheduleAssignmentsFixture()
		.filter((row) => row.member?.memberProfileId === "mp-1")
		.map((row) => ({ ...row, ...changes[row.day] }));

/** A day not worked of `dayType`. */
const notWorked = (dayType: string): Partial<ScheduleAssignment> => ({
	off: true,
	offReason: "OFF",
	dayType,
	shift: null,
	jobTitle: null,
});

/** A broken weekly rule about Aisha, marked on the week's first day, under the frozen constraint `constraintId`. */
const weeklyIssue = (
	constraintId: string | null,
	overrides: Partial<RosterIssue> = {}
): RosterIssue =>
	rosterIssueFixture({
		key: `mustFix|days_of_day_types_per_period|${constraintId ?? ""}|mp-1`,
		day: MONDAY,
		days: [MONDAY],
		subject: {
			kind: "rule",
			rule: "days_of_day_types_per_period",
			constraintId,
		},
		...overrides,
	});

/** The sources of a suggestion, over the given roster rows. */
const sourcesOf = (
	assignments: ReadonlyArray<ScheduleAssignment>
): DayTypeFixSources => ({
	constraints: CONSTRAINTS,
	assignments,
	nonWorkingDayTypes: NON_WORKING_DAY_TYPES,
});

describe("neededDayTypeOf", () => {
	it.each([
		["a rule asking at least one rest day", "rest-copy", "REST"],
		["the mirror rule asking at least one day off", "off-copy", "OFF"],
		["a rule counting two day types", "either-copy", undefined],
		["a rule asking exactly, which may be over", "exactly-copy", undefined],
		["a constraint that is not on the page", "gone-copy", undefined],
		["a broken rule naming no constraint", null, undefined],
	])("reads %s", (_case, constraintId, needed) => {
		expect(
			neededDayTypeOf(weeklyIssue(constraintId).subject, CONSTRAINTS)
		).toBe(needed);
	});

	it("knows the rule by its constraint type's code too", () => {
		expect(
			neededDayTypeOf(
				{
					kind: "rule",
					rule: "DAY_TYPE_DAYS_PER_WEEK",
					constraintId: "rest-copy",
				},
				CONSTRAINTS
			)
		).toBe("REST");
	});

	it.each([
		["another rule", { kind: "rule", rule: "minimum_rest_between_shifts" }],
		["a generation error", { kind: "generationError" }],
		["no subject", undefined],
	] as const)("has nothing for %s", (_case, subject) => {
		expect(neededDayTypeOf(subject, CONSTRAINTS)).toBeUndefined();
	});
});

describe("dayTypeRetypeOf", () => {
	it("retypes the person's one day off to the rest day the rule needs", () => {
		const week = aishaWeek({
			[SATURDAY]: notWorked("OFF"),
			[SUNDAY]: { ...notWorked("OFF"), offReason: "LEAVE" },
		});

		expect(dayTypeRetypeOf(weeklyIssue("rest-copy"), sourcesOf(week))).toEqual({
			issueKey: weeklyIssue("rest-copy").key,
			constraintId: "rest-copy",
			membershipId: "m-1",
			memberProfileId: "mp-1",
			day: SATURDAY,
			from: "OFF",
			to: "REST",
		});
	});

	it("chooses the last of several days off in the week", () => {
		const week = aishaWeek({
			[FRIDAY]: notWorked("OFF"),
			[SATURDAY]: notWorked("OFF"),
			[SUNDAY]: notWorked("OFF"),
		});

		expect(
			dayTypeRetypeOf(weeklyIssue("rest-copy"), sourcesOf(week))?.day
		).toBe(SUNDAY);
	});

	it("serves the mirror rule: a rest day becomes the day off it needs", () => {
		const week = aishaWeek({
			[SATURDAY]: notWorked("REST"),
			[SUNDAY]: notWorked("REST"),
		});

		expect(
			dayTypeRetypeOf(weeklyIssue("off-copy"), sourcesOf(week))
		).toMatchObject({ day: SUNDAY, from: "REST", to: "OFF" });
	});

	it.each<[string, Record<string, Partial<ScheduleAssignment>>]>([
		[
			"only leave on the days not worked",
			{
				[SATURDAY]: { ...notWorked("OFF"), offReason: "LEAVE" },
				[SUNDAY]: { ...notWorked("OFF"), leaveRequestId: "leave-1" },
			},
		],
		[
			"only days of the needed type or of no type",
			{
				[SATURDAY]: notWorked("REST"),
				[SUNDAY]: { ...notWorked("OFF"), offReason: "ABSENT", dayType: null },
			},
		],
		[
			"only a day waiting for a manager's decision",
			{
				[SATURDAY]: { ...notWorked("OFF"), flag: "NEEDS_DECISION" },
				[SUNDAY]: notWorked("REST"),
			},
		],
		[
			"only a day of a type the schedule does not offer",
			{
				[SATURDAY]: notWorked("PUBLIC_HOLIDAY"),
				[SUNDAY]: notWorked("REST"),
			},
		],
	])("suggests nothing with %s", (_case, changes) => {
		expect(
			dayTypeRetypeOf(weeklyIssue("rest-copy"), sourcesOf(aishaWeek(changes)))
		).toBeUndefined();
	});

	it("suggests nothing for someone who works every day of the week", () => {
		const everyDay = aishaWeek().map((row, _index, rows) => ({
			...row,
			...(row.shift === null
				? {
						off: false,
						offReason: null,
						shift: rows[0]?.shift ?? null,
						jobTitle: rows[0]?.jobTitle ?? null,
					}
				: {}),
		}));

		expect(
			dayTypeRetypeOf(weeklyIssue("rest-copy"), sourcesOf(everyDay))
		).toBeUndefined();
	});

	it("leaves the days before the item's day and after its week alone", () => {
		const week = aishaWeek({
			[MONDAY]: notWorked("OFF"),
			[SATURDAY]: notWorked("REST"),
			[SUNDAY]: notWorked("REST"),
		});
		const nextMonday = {
			...week[0]!,
			assignmentId: "next-monday",
			day: "2026-10-19",
			...notWorked("OFF"),
		};

		expect(
			dayTypeRetypeOf(
				weeklyIssue("rest-copy", { day: "2026-10-13", days: ["2026-10-13"] }),
				sourcesOf([...week, nextMonday])
			)
		).toBeUndefined();
	});

	it.each<[string, RosterIssue]>([
		["the day type needed is not known", weeklyIssue("either-copy")],
		[
			"the item names no person",
			weeklyIssue("rest-copy", { memberProfileId: null }),
		],
		[
			"the item names no day",
			weeklyIssue("rest-copy", { day: null, days: [] }),
		],
		[
			"the item stands for several days",
			weeklyIssue("rest-copy", { days: [MONDAY, "2026-10-19"] }),
		],
	])("suggests nothing when %s", (_case, issue) => {
		const week = aishaWeek({ [SATURDAY]: notWorked("OFF") });

		expect(dayTypeRetypeOf(issue, sourcesOf(week))).toBeUndefined();
	});

	it("suggests nothing when the schedule does not offer the type needed", () => {
		const week = aishaWeek({ [SATURDAY]: notWorked("OFF") });

		expect(
			dayTypeRetypeOf(weeklyIssue("rest-copy"), {
				...sourcesOf(week),
				nonWorkingDayTypes: ["OFF"],
			})
		).toBeUndefined();
	});

	it("never retypes a part-timer's day", () => {
		const week = aishaWeek({ [SATURDAY]: notWorked("OFF") }).map((row) => ({
			...row,
			member: row.member && { ...row.member, partTime: true },
		}));

		expect(
			dayTypeRetypeOf(weeklyIssue("rest-copy"), sourcesOf(week))
		).toBeUndefined();
	});
});

/** A retype of `membershipId`'s `day` from a day off to a rest day, for the item `issueKey`. */
const retypeFixture = (
	issueKey: string,
	membershipId: string,
	day: string,
	overrides: Partial<DayTypeRetype> = {}
): DayTypeRetype => ({
	issueKey,
	constraintId: "rest-copy",
	membershipId,
	memberProfileId: `profile-of-${membershipId}`,
	day,
	from: "OFF",
	to: "REST",
	...overrides,
});

describe("dayTypeRetypes", () => {
	it("keeps only the items with a retype, by their key", () => {
		const week = aishaWeek({ [SATURDAY]: notWorked("OFF") });
		const issues = [weeklyIssue("rest-copy"), rosterIssueFixture()];

		expect([...dayTypeRetypes(issues, sourcesOf(week)).keys()]).toEqual([
			weeklyIssue("rest-copy").key,
		]);
	});
});

describe("dayTypeRetypeGroups", () => {
	it("groups two or more retypes of one rule that read the same, counting the people", () => {
		const retypes = new Map([
			["a", retypeFixture("a", "m-1", SATURDAY)],
			["b", retypeFixture("b", "m-3", SUNDAY)],
			["c", retypeFixture("c", "m-3", "2026-10-25")],
			["d", retypeFixture("d", "m-4", SUNDAY, { from: "REST", to: "OFF" })],
		]);
		const listed = [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "d" }];

		expect(dayTypeRetypeGroups(listed, retypes)).toEqual([
			{
				key: "rest-copy|OFF|REST",
				from: "OFF",
				to: "REST",
				people: 2,
				retypes: [retypes.get("a"), retypes.get("b"), retypes.get("c")],
			},
		]);
	});

	it("offers nothing for one retype alone, or for items not listed", () => {
		const retypes = new Map([
			["a", retypeFixture("a", "m-1", SATURDAY)],
			["b", retypeFixture("b", "m-3", SUNDAY)],
		]);

		expect(dayTypeRetypeGroups([{ key: "a" }], retypes)).toEqual([]);
	});
});

describe("retypeCells", () => {
	it("sends each day as not worked, of the type needed, once", () => {
		expect(
			retypeCells([
				retypeFixture("a", "m-1", SATURDAY),
				retypeFixture("b", "m-1", SATURDAY),
				retypeFixture("c", "m-3", SUNDAY),
			])
		).toEqual([
			{ membershipId: "m-1", day: SATURDAY, kind: "OFF", dayType: "REST" },
			{ membershipId: "m-3", day: SUNDAY, kind: "OFF", dayType: "REST" },
		]);
	});
});

describe("cellsNotHeld", () => {
	const cells = retypeCells([
		retypeFixture("a", "m-1", SATURDAY),
		retypeFixture("b", "m-3", SATURDAY),
		retypeFixture("c", "m-4", SUNDAY),
	]);

	it("keeps every cell when the checks only inform", () => {
		expect(
			cellsNotHeld(cells, [rosterCheckFixture({ day: SATURDAY })])
		).toEqual(cells);
	});

	it.each(["REFUSED", "NEEDS_REMARK", "NEEDS_ACKNOWLEDGEMENT"] as const)(
		"leaves out the cell a %s check names",
		(severity) => {
			expect(
				cellsNotHeld(cells, [
					rosterCheckFixture({ severity, membershipId: "m-3", day: SATURDAY }),
				])
			).toEqual([cells[0], cells[2]]);
		}
	);

	it("leaves out every cell of the day of a holding check that names no person", () => {
		expect(
			cellsNotHeld(cells, [
				rosterCheckFixture({ severity: "REFUSED", day: SATURDAY }),
			])
		).toEqual([cells[2]]);
	});
});
