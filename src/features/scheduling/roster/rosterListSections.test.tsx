import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import type { RosterSidePanelSection } from "@/features/scheduling/RosterSidePanel";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import {
	emptyFindingsFixture,
	generationFindingsFixture,
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
	issues: [],
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
		["Issues, as one list by what to do", ["issues", inputOf()], ["issues"]],
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
			{
				title: "scheduling.issues.startChanged.title(2)",
				detail: "scheduling.issues.startChanged.detail",
			},
		]);
	});

	it("given_nothingChangedSinceGeneration_when_said_then_saysNothing", () => {
		expect(issueNoteLines(inputOf())).toEqual([]);
	});

	it("given_handChanges_when_said_then_saysTheNotesAreFromGenerationOnlyWhereValidateIsNotThere", () => {
		const [first, ...rest] = scheduleAssignmentsFixture();
		const edited = [
			{
				...first!,
				lastChange: {
					changeId: "rc-1",
					appliedAt: "2026-10-10T09:00:00Z",
					appliedBy: { membershipId: "m-9", displayName: "Sam Tan" },
					remark: null,
					before: {
						kind: "OFF" as const,
						dayType: "OFF",
						shift: null,
						jobTitle: null,
					},
				},
			},
			...rest,
		];
		const withFindings = (
			overrides: Partial<RosterListInput>
		): RosterListInput => {
			const input = inputOf(overrides, { week: "2026-10-12" }, edited);
			return {
				...input,
				roster: { ...input.roster, findings: generationFindingsFixture() },
			};
		};

		expect(issueNoteLines(withFindings({}))).toEqual([
			{
				title: "scheduling.issues.fromGeneration.title",
				detail: "scheduling.issues.fromGeneration.detail",
			},
		]);
		expect(
			issueNoteLines(withFindings({ validationNote: <p>Validated</p> }))
		).toEqual([]);
	});
});
