import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import { coverOfferFixture } from "@/features/scheduling/coverOffers/fixtures";
import type { RosterSidePanelSection } from "@/features/scheduling/RosterSidePanel";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import {
	emptyFindingsFixture,
	generatedScheduleFixture,
	generationFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	issueNoteLines,
	rosterListSections,
	type RosterListInput,
} from "./rosterListSections";
import type { RosterSearch } from "./rosterSearch";
import { rosterViewOf } from "./rosterView";

/** Echoes the key and its values, so sections can be read without copy. */
const t = ((key: string, values?: Record<string, unknown>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;

const TARGET = {
	companyId: "c-1",
	unit: { branchId: "b-1", departmentId: "d-1" },
	scheduleId: "s-1",
	runId: "run-1",
};

/** The fixture roster with Aisha's Tuesday to decide. */
const withDayToDecide = (): Array<ScheduleAssignment> =>
	scheduleAssignmentsFixture().map((row) =>
		row.member?.membershipId === "m-1" && row.day === "2026-10-13"
			? { ...row, flag: "NEEDS_DECISION" as const }
			: row
	);

/** The list input for a roster of `assignments`, viewed as `view`. */
const inputOf = (
	overrides: Partial<Omit<RosterListInput, "roster">> = {},
	view: RosterSearch = { week: "2026-10-12" },
	assignments: Array<ScheduleAssignment> = scheduleAssignmentsFixture()
): RosterListInput => ({
	roster: rosterViewOf({
		schedule: generatedScheduleFixture({
			status: "GENERATED",
			generation: generationFixture({ findings: emptyFindingsFixture() }),
		}),
		assignments,
		view,
		today: "2026-10-14",
		shifts: [],
		constraints: [],
		membersWithChangedStart: 0,
		hasDetails: true,
		hasApproval: true,
		editable: true,
		withSummary: true,
		changesLeave: false,
	}),
	assignments,
	t,
	language: "en",
	membersWithChangedStart: 0,
	onShowAllIssues: vi.fn(),
	...overrides,
});

/** The keys `RosterSidePanel` shows: sections with items or content. */
const shownKeys = (
	sections: ReadonlyArray<RosterSidePanelSection>
): Array<string> =>
	sections
		.filter(
			({ items, content }) => (items?.length ?? 0) > 0 || Boolean(content)
		)
		.map(({ key }) => key);

describe("rosterListSections", () => {
	it.each<[string, Parameters<typeof rosterListSections>, Array<string>]>([
		["Issues with nothing in it", ["issues", inputOf()], []],
		[
			"Issues with a day to decide",
			["issues", inputOf({}, undefined, withDayToDecide())],
			["daysToDecide"],
		],
		[
			"Issues with starting points",
			["issues", inputOf({ startingRuns: new Map([["mp-1", 3]]) })],
			["startingPoints"],
		],
		[
			"Issues on a published roster with offers out",
			[
				"issues",
				inputOf({
					coverOffers: {
						offers: [coverOfferFixture()],
						failed: false,
						retry: vi.fn(),
						target: TARGET,
						timeZone: "Asia/Singapore",
					},
				}),
			],
			["offersOut"],
		],
		[
			"Issues on a published roster whose offers couldn't be read",
			[
				"issues",
				inputOf({
					coverOffers: {
						offers: [],
						failed: true,
						retry: vi.fn(),
						target: TARGET,
						timeZone: "Asia/Singapore",
					},
				}),
			],
			["offersOut"],
		],
		[
			"Issues on a published roster with no offer out",
			[
				"issues",
				inputOf({
					coverOffers: {
						offers: [],
						failed: false,
						retry: vi.fn(),
						target: TARGET,
						timeZone: "Asia/Singapore",
					},
				}),
			],
			[],
		],
		[
			"Issues opened from Aisha's row header",
			[
				"issues",
				inputOf(
					{},
					{ week: "2026-10-12", panel: "issues", member: "m-1" },
					withDayToDecide()
				),
			],
			["about", "daysToDecide"],
		],
		["Changed with no change", ["changes", inputOf()], []],
		[
			"Changed with the latest change",
			["changes", inputOf({ latestChange: <p>Latest</p> })],
			["latest"],
		],
		[
			"Details with the schedule's history",
			[
				"details",
				inputOf({
					details: [{ label: "Created", value: "Today" }],
				}),
			],
			["details"],
		],
		[
			"Approval with its trail",
			["approval", inputOf({ approval: <p>Trail</p> })],
			["trail"],
		],
	])("given %s, then shows those sections", (_, [list, input], expected) => {
		expect(shownKeys(rosterListSections(list, input))).toEqual(expected);
	});

	it("given_aHeaderNarrowedIssuesList_when_built_then_namesTheMemberInItsChip", () => {
		const [about] = rosterListSections(
			"issues",
			inputOf(
				{},
				{ week: "2026-10-12", panel: "issues", member: "m-1" },
				withDayToDecide()
			)
		);

		expect(about?.key).toBe("about");
		expect(about?.content).toMatchObject({
			props: { chips: [{ key: "member", label: "Aisha Rahman" }] },
		});
	});
});

describe("issueNoteLines", () => {
	it("given_changedStartsAndNoFindings_when_said_then_saysOnlyTheChangedStarts", () => {
		expect(issueNoteLines(inputOf({ membersWithChangedStart: 2 }))).toEqual([
			"scheduling.startingContext.stale(2)",
		]);
	});

	it("given_nothingChangedSinceGeneration_when_said_then_saysNothing", () => {
		expect(issueNoteLines(inputOf())).toEqual([]);
	});
});
