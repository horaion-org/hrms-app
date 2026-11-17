import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { rosterFromAssignments } from "@/features/scheduling/roster/roster";
import {
	ruleFixture,
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	emptyFindingsFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";
import {
	issuesOfRoster,
	type RosterIssueSourceInput,
} from "./rosterIssueSources";

/** Echoes the key and its values, so items can be read without copy. */
const t = ((key: string, values?: Record<string, unknown>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;

const PERIOD = { start: "2026-10-12", end: "2026-10-18" };

/** Aisha's Monday, its shift left short by her leave. */
const leaveGapRow = (): ScheduleAssignment => {
	const row = scheduleAssignmentsFixture().find(
		(assignment) =>
			assignment.member?.membershipId === "m-1" &&
			assignment.day === "2026-10-12"
	);
	if (!row) throw new Error("fixture changed");
	return { ...row, uncoveredShift: row.shift };
};

const input = (
	overrides: Partial<RosterIssueSourceInput> = {},
	roster: Partial<RosterIssueSourceInput["roster"]> = {}
): RosterIssueSourceInput => ({
	roster: {
		rows: rosterFromAssignments(scheduleAssignmentsFixture(), PERIOD),
		findings: emptyFindingsFixture(),
		names: null,
		leaveAndCover: [],
		toDecide: [],
		...roster,
	},
	check: undefined,
	noteLines: [],
	t,
	language: "en",
	...overrides,
});

describe("issuesOfRoster", () => {
	it("lists a shift short by leave once, to fix with Find cover, even when a gap names it too", () => {
		const row = leaveGapRow();
		const shiftId = row.uncoveredShift?.shiftId ?? "";
		const issues = issuesOfRoster(
			input(
				{},
				{
					leaveAndCover: [row],
					findings: {
						...emptyFindingsFixture(),
						conflicts: [
							staffingGapFixture({ date: row.day, shiftUuids: [shiftId] }),
						],
					},
				}
			)
		);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({
			group: "mustFix",
			day: "2026-10-12",
			action: { kind: "findCover", gap: { shiftId, day: "2026-10-12" } },
		});
		expect(issues[0]?.rule).toMatch(/^scheduling\.issues\.leaveShort\(/);
	});

	it("lists a day to decide as to fix", () => {
		const [row] = scheduleAssignmentsFixture();
		if (!row) throw new Error("fixture changed");

		const issues = issuesOfRoster(
			input({}, { toDecide: [{ ...row, flag: "NEEDS_DECISION" }] })
		);

		expect(issues.map((issue) => [issue.group, issue.rule])).toEqual([
			["mustFix", "scheduling.rosterMarkers.needsDecision"],
		]);
	});

	it("lists starting points and the lines above the list for information", () => {
		const issues = issuesOfRoster(
			input({
				startingRuns: new Map([["mp-1", 3]]),
				noteLines: [
					{ title: "5 people's days changed", detail: "Regenerate to plan" },
				],
			})
		);

		expect(issues.map((issue) => [issue.group, issue.who, issue.rule])).toEqual(
			[
				[
					"forInformation",
					"Aisha Rahman",
					"scheduling.detail.workedInARow(Aisha Rahman|3)",
				],
				["forInformation", "5 people's days changed", "Regenerate to plan"],
			]
		);
	});

	it("lists a broken roster with no rule named once, and the rules not met apart", () => {
		const issues = issuesOfRoster(
			input({
				check: rulesCheckFixture({
					status: "BROKEN",
					notMet: [ruleFixture({ constraintName: "Weekends off" })],
				}),
			})
		);

		expect(issues.map((issue) => [issue.group, issue.who])).toEqual([
			["mustFix", "scheduling.issues.wholeRoster"],
			["notMet", "scheduling.issues.wholeRoster"],
		]);
		expect(issues[0]?.rule).toBe(
			"scheduling.issues.brokenMust(scheduling.rulesCheck.unnamedRule)"
		);
	});

	it("lists a generation error marked if possible as not met, and any other as to fix", () => {
		const issues = issuesOfRoster(
			input(
				{},
				{
					findings: {
						...emptyFindingsFixture(),
						errors: [
							{
								employeeId: null,
								date: "2026-10-12",
								messages: [
									"If possible, not met: shift Morning: got 1 of at least 2.",
									"Ann: 2 days off in the 2 weeks, needs at least 3.",
								],
							},
						],
					},
				}
			)
		);

		expect(issues.map((issue) => issue.group)).toEqual(["notMet", "mustFix"]);
	});
});
