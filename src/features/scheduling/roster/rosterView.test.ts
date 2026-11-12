import { describe, expect, it } from "vitest";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import {
	emptyFindingsFixture,
	generatedScheduleFixture,
	generationFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
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
		const { days, periodDays } = viewOf({ view: {} });

		expect(days[0]).toBe("2026-10-12");
		expect(days).toHaveLength(7);
		expect(periodDays).toEqual(days);
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
				coverGap: undefined,
				openList: undefined,
			})
		).toBeUndefined();
	});

	it("given_aCoverGapOnARosterThatMayBeChanged_when_asked_then_findCoverOverTheList", () => {
		expect(
			sidePanelOf({
				editable: true,
				chosenRow: undefined,
				chosenCell: undefined,
				coverGap: { shiftId: "front-desk-am-copy", day: "2026-10-17" },
				openList: "issues",
			})
		).toBe("cover");
	});

	it("given_aCoverGapOnAReadOnlyRoster_when_asked_then_noFindCover", () => {
		expect(
			sidePanelOf({
				editable: false,
				chosenRow: undefined,
				chosenCell: undefined,
				coverGap: { shiftId: "front-desk-am-copy", day: "2026-10-17" },
				openList: undefined,
			})
		).toBeUndefined();
	});
});

describe("rosterViewOf: Find cover", () => {
	it("given_coverInTheUrl_when_editable_then_theGapAndTheCoverPanel", () => {
		const view = viewOf({
			view: { week: "2026-10-12", cover: "front-desk-am-copy|2026-10-17" },
		});

		expect(view.coverGap).toEqual({
			shiftId: "front-desk-am-copy",
			day: "2026-10-17",
		});
		expect(view.sidePanel).toBe("cover");
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
