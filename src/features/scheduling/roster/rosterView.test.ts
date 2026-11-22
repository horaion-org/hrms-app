import { describe, expect, it } from "vitest";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import {
	emptyFindingsFixture,
	generatedScheduleFixture,
	generationFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import type { RosterWeek } from "@/features/scheduling/roster/RosterWeekBar";
import type {
	DayBeforeRun,
	DaysBeforeRunState,
} from "@/features/scheduling/startingContext/daysBeforeRun";
import {
	rosterViewOf,
	sidePanelOf,
	type RosterView,
	type RosterViewInput,
} from "./rosterView";

/** Schedule s-1's week (12–18 October 2026), generated without findings. */
const schedule = generatedScheduleFixture({
	status: "GENERATED",
	generation: generationFixture({ findings: emptyFindingsFixture() }),
});

/** The fixture roster with one member's day flagged. */
const flagged = (
	membershipId: string,
	day: string,
	flag: NonNullable<ScheduleAssignment["flag"]>
): Array<ScheduleAssignment> =>
	scheduleAssignmentsFixture().map((row) =>
		row.member?.membershipId === membershipId && row.day === day
			? { ...row, flag }
			: row
	);

const PLAIN: RosterViewInput = {
	schedule,
	assignments: scheduleAssignmentsFixture(),
	view: { week: "2026-10-12" },
	today: "2026-10-14",
	shifts: [],
	constraints: [],
	membersWithChangedStart: 0,
	hasDetails: false,
	hasApproval: false,
	editable: true,
	withSummary: true,
	changesLeave: false,
};

const viewOf = (overrides: Partial<RosterViewInput>): RosterView =>
	rosterViewOf({ ...PLAIN, ...overrides });

describe("rosterViewOf", () => {
	it.each<
		[
			string,
			Partial<RosterViewInput>,
			Pick<RosterView, "openList" | "sidePanel" | "shownDay">,
		]
	>([
		[
			"nothing chosen",
			{},
			{ openList: undefined, sidePanel: undefined, shownDay: "2026-10-14" },
		],
		[
			"a phone's day in the URL",
			{ view: { week: "2026-10-12", day: "2026-10-16" } },
			{ openList: undefined, sidePanel: undefined, shownDay: "2026-10-16" },
		],
		[
			"Issues named with a day to decide in it",
			{
				view: { week: "2026-10-12", panel: "issues" },
				assignments: flagged("m-1", "2026-10-13", "NEEDS_DECISION"),
			},
			{ openList: "issues", sidePanel: "list", shownDay: "2026-10-14" },
		],
		[
			"Changed named with no change in it",
			{ view: { week: "2026-10-12", panel: "changes" } },
			{ openList: undefined, sidePanel: undefined, shownDay: "2026-10-14" },
		],
		[
			"Details named without details",
			{ view: { week: "2026-10-12", panel: "details" } },
			{ openList: undefined, sidePanel: undefined, shownDay: "2026-10-14" },
		],
		[
			"Details named with details",
			{ view: { week: "2026-10-12", panel: "details" }, hasDetails: true },
			{ openList: "details", sidePanel: "list", shownDay: "2026-10-14" },
		],
		[
			"a day chosen to edit, over a named list",
			{
				view: { week: "2026-10-12", panel: "details", cell: "m-1|2026-10-13" },
				hasDetails: true,
			},
			{ openList: undefined, sidePanel: "dayEditor", shownDay: "2026-10-13" },
		],
		[
			"a shift chosen on a read-only roster",
			{ view: { week: "2026-10-12", cell: "m-1|2026-10-13" }, editable: false },
			{
				openList: undefined,
				sidePanel: "shiftDetails",
				shownDay: "2026-10-13",
			},
		],
		[
			"a day off chosen on a read-only roster",
			{ view: { week: "2026-10-12", cell: "m-1|2026-10-17" }, editable: false },
			{ openList: undefined, sidePanel: undefined, shownDay: "2026-10-17" },
		],
	])("given %s, then shows its panel and day", (_, overrides, expected) => {
		const { openList, sidePanel, shownDay } = viewOf(overrides);

		expect({ openList, sidePanel, shownDay }).toEqual(expected);
	});

	it("given_noWeekInTheURL_when_derived_then_showsTodaysWeek", () => {
		const { days, phoneDays } = viewOf({ view: {} });

		expect(days[0]).toBe("2026-10-12");
		expect(days).toHaveLength(7);
		expect(phoneDays).toEqual(days);
	});

	it("given_aPart_when_viewed_then_sevenDaysAndTheOthersOutside", () => {
		const { days, phoneDays, outsideDays, rows } = viewOf({
			view: {},
			schedule: { ...schedule, coveredFrom: "2026-10-15" },
		});

		expect(days).toHaveLength(7);
		expect(phoneDays).toEqual(days.slice(3));
		expect(outsideDays).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
		expect(
			rows.every((row) =>
				Object.keys(row.days).every((day) => day >= "2026-10-15")
			)
		).toBe(true);
	});

	it("given_issuesOpenedFromAMembersHeader_when_derived_then_listsOnlyThatMember", () => {
		const view: RosterSearch = {
			week: "2026-10-12",
			panel: "issues",
			member: "m-1",
		};

		expect(
			viewOf({
				view,
				assignments: flagged("m-1", "2026-10-13", "NEEDS_DECISION"),
			}).issuesAbout
		).toEqual({ kind: "member", membershipId: "m-1" });
	});

	it("given_eachListsInput_when_derived_then_countsItsEntries", () => {
		const { listCounts } = viewOf({
			assignments: flagged("m-2", "2026-10-14", "LEAVE_REQUESTED"),
			membersWithChangedStart: 2,
			hasDetails: true,
			hasApproval: true,
			hasValidation: true,
		});

		// The changed starts count once, as the one line Issues says them in; the requested leave once.
		expect(listCounts).toEqual({
			issues: 2,
			changes: 0,
			details: 1,
			approval: 1,
		});
	});

	it.each<[string, Partial<RosterViewInput>, boolean]>([
		["a day to decide, read-only", { editable: false }, true],
		["a day to decide, in the editor that says it itself", {}, false],
		[
			"a day to decide on a member's own roster",
			{ editable: false, withSummary: false },
			false,
		],
	])("given %s, then says its notes first: %s", (_, overrides, says) => {
		const { chosenDayNotes } = viewOf({
			view: { week: "2026-10-12", cell: "m-1|2026-10-13" },
			assignments: flagged("m-1", "2026-10-13", "NEEDS_DECISION"),
			...overrides,
		});

		expect(chosenDayNotes !== undefined).toBe(says);
	});

	it.each<[string, boolean, boolean]>([
		["an editor that changes leave", true, false],
		["an editor without leave choices", false, true],
	])(
		"given requested leave in %s, then says the note first: %s",
		(_, changesLeave, says) => {
			const { chosenDayNotes } = viewOf({
				view: { week: "2026-10-12", cell: "m-1|2026-10-13" },
				assignments: flagged("m-1", "2026-10-13", "LEAVE_REQUESTED"),
				changesLeave,
			});

			expect(chosenDayNotes !== undefined).toBe(says);
			if (says)
				expect(chosenDayNotes).toMatchObject({
					membershipId: "m-1",
					note: { flag: "LEAVE_REQUESTED" },
				});
		}
	);
});

describe("sidePanelOf", () => {
	it("given_nothingChosenAndNoList_when_asked_then_opensNothing", () => {
		expect(
			sidePanelOf({
				editable: true,
				chosenRow: undefined,
				chosenCell: undefined,
				openList: undefined,
			})
		).toBeUndefined();
	});

	it("given_theIssuesList_when_asked_then_theList", () => {
		expect(
			sidePanelOf({
				editable: true,
				chosenRow: undefined,
				chosenCell: undefined,
				openList: "issues",
			})
		).toBe("list");
	});
});

describe("rosterViewOf: Find cover", () => {
	it("given_coverInTheUrl_when_editable_then_issuesOpensOnTheGap", () => {
		const view = viewOf({
			view: {
				week: "2026-10-12",
				panel: "issues",
				cover: "front-desk-am-copy|2026-10-17",
			},
		});

		expect(view.coverGap).toEqual({
			shiftId: "front-desk-am-copy",
			day: "2026-10-17",
		});
		expect(view.openList).toBe("issues");
		expect(view.sidePanel).toBe("list");
	});

	it("given_coverInTheUrl_when_readOnly_then_nothing", () => {
		const view = viewOf({
			editable: false,
			view: { week: "2026-10-12", cover: "front-desk-am-copy|2026-10-17" },
		});

		expect(view.coverGap).toBeUndefined();
		expect(view.sidePanel).toBeUndefined();
	});
});

describe("rosterViewOf: the findings' names", () => {
	it("given_findingsWithOnlyAnInformationNote_when_derived_then_itsPersonIsNamed", () => {
		const view = viewOf({
			schedule: generatedScheduleFixture({
				status: "GENERATED",
				generation: generationFixture({
					findings: {
						...emptyFindingsFixture(),
						members: [
							{
								memberProfileId: "mp-3",
								membershipId: "m-3",
								displayName: "Chen Wei",
							},
						],
						diagnostics: [
							{
								code: "PRIOR_REST_BLOCKS_SHIFTS",
								severity: "info",
								audience: "roster",
								message: "Chen Wei: rest carried in.",
								entities: { employeeId: "mp-3", date: "2026-10-12" },
							},
						],
					},
				}),
			}),
		});

		expect(view.names?.members.get("mp-3")).toBe("Chen Wei");
	});
});

/*
 * The days before schedule s-1's run (12–18 October 2026): 28 September to
 * 11 October, the weeks of 28 September and 5 October, neither with a
 * schedule of its own in the month.
 */
describe("rosterViewOf, with the days before the run", () => {
	const OCTOBER: Array<RosterWeek> = [
		{ start: "2026-10-05", end: "2026-10-11", disabled: true },
		{ start: "2026-10-12", end: "2026-10-18" },
	];
	const dayOf = (
		date: string,
		memberProfileId = "mp-1",
		enteredByHand = false
	): DayBeforeRun => ({
		memberProfileId,
		date,
		what: { kind: "off", dayType: null },
		enteredByHand,
	});
	const ready = (days: Array<DayBeforeRun>): DaysBeforeRunState => ({
		status: "ready",
		days,
	});
	const WEEK_BEFORE = [
		"2026-10-05",
		"2026-10-06",
		"2026-10-07",
		"2026-10-08",
		"2026-10-09",
		"2026-10-10",
		"2026-10-11",
	];

	it("given_aPartWithAKnownDayInItsFirstWeek_when_derived_then_thoseDaysAreColumnsBeforeTheRun", () => {
		const view = viewOf({
			view: {},
			schedule: { ...schedule, coveredFrom: "2026-10-15" },
			daysBefore: ready([dayOf("2026-10-13")]),
			monthWeeks: OCTOBER,
		});

		expect(view.beforeRunDays).toEqual([
			"2026-10-12",
			"2026-10-13",
			"2026-10-14",
		]);
		expect(view.outsideDays).toEqual([]);
		expect(view.phoneDays).toEqual(view.days);
		// The phone still opens on the run's first day; the days before are a step back.
		expect(view.shownDay).toBe("2026-10-15");
		expect(view.daysBeforeByMember.get("mp-1")?.["2026-10-13"]).toEqual(
			dayOf("2026-10-13")
		);
	});

	it("given_aPartWithNothingKnownInItsFirstWeek_when_derived_then_itsDaysStayOutside", () => {
		const view = viewOf({
			view: {},
			schedule: { ...schedule, coveredFrom: "2026-10-15" },
			daysBefore: ready([dayOf("2026-10-07")]),
			monthWeeks: OCTOBER,
		});

		expect(view.beforeRunDays).toEqual([]);
		expect(view.outsideDays).toEqual([
			"2026-10-12",
			"2026-10-13",
			"2026-10-14",
		]);
	});

	it("given_aURLWeekWhollyBeforeTheRun_when_derived_then_showsItAsDaysBefore", () => {
		const view = viewOf({
			view: { week: "2026-10-05" },
			daysBefore: ready([dayOf("2026-10-07", "mp-1", true)]),
			monthWeeks: OCTOBER,
		});

		expect(view.days).toEqual(WEEK_BEFORE);
		expect(view.beforeRunDays).toEqual(WEEK_BEFORE);
		expect(view.outsideDays).toEqual([]);
		expect(view.mondaysBeforeRun).toEqual(["2026-10-05"]);
		expect(view.shownDay).toBe("2026-10-05");
		expect(view.enteredNote).toEqual({ count: 1, week: "2026-10-05" });
	});

	it.each<[string, Partial<RosterViewInput>, string]>([
		[
			"the days still being read",
			{ daysBefore: { status: "pending" } },
			"2026-10-05",
		],
		[
			"the month's weeks still being read",
			{ daysBefore: ready([dayOf("2026-10-07")]), monthWeeks: undefined },
			"2026-10-05",
		],
		[
			"the read ending with nothing known",
			{ daysBefore: ready([]) },
			"2026-10-12",
		],
		[
			"only someone not on the roster known",
			{ daysBefore: ready([dayOf("2026-10-07", "mp-other")]) },
			"2026-10-12",
		],
		[
			"only a member who no longer resolves known",
			{ daysBefore: ready([dayOf("2026-10-07", "mp-9")]) },
			"2026-10-12",
		],
		["no days before at all", { daysBefore: undefined }, "2026-10-12"],
	])("given %s, a URL week before the run shows %s", (_, change, expected) => {
		const view = viewOf({
			view: { week: "2026-10-05" },
			monthWeeks: OCTOBER,
			...change,
		});

		expect(view.days[0]).toBe(expected);
		// Nothing is drawn as a day before until it can be shown.
		expect(view.beforeRunDays).toEqual([]);
		expect(view.mondaysBeforeRun).toEqual([]);
		expect(view.enteredNote).toBeUndefined();
	});
});
