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
		expect(issues[0]?.rule).toMatch(/^scheduling\.issues\.leaveShortNamed\(/);
	});

	it("names the one person whose leave left the shift short, and nobody when several did", () => {
		const row = leaveGapRow();
		const ruleOf = (leaveAndCover: Array<ScheduleAssignment>): unknown =>
			issuesOfRoster(input({}, { leaveAndCover }))[0]?.rule;
		const other = {
			...row,
			assignmentId: "other-leave",
			member: row.member && {
				...row.member,
				membershipId: "m-2",
				displayName: "Ben Ong",
			},
		};

		expect(ruleOf([row])).toMatch(
			/^scheduling\.issues\.leaveShortNamed\(Aisha Rahman\|/
		);
		expect(ruleOf([row, other])).toMatch(/^scheduling\.issues\.leaveShort\(/);
	});

	it("lists a shift short by leave as information once the current check finds that shift staffed", () => {
		const row = leaveGapRow();
		const shiftId = row.uncoveredShift?.shiftId ?? "";
		const listed = (checkedGaps: ReadonlySet<string>): Array<unknown> =>
			issuesOfRoster(input({ checkedGaps }, { leaveAndCover: [row] }));

		expect(listed(new Set())).toEqual([
			expect.objectContaining({
				group: "forInformation",
				action: { kind: "show" },
			}),
		]);
		expect(listed(new Set([`gap|${shiftId}|${row.day}`]))).toEqual([
			expect.objectContaining({
				group: "mustFix",
				action: { kind: "findCover", gap: { shiftId, day: row.day } },
			}),
		]);
	});

	it("lists a setup note first by who it is about and its day, in the engine's words without names", () => {
		const issues = issuesOfRoster(
			input(
				{},
				{
					findings: {
						...emptyFindingsFixture(),
						diagnostics: [
							{
								code: "PRIOR_REST_BLOCKS_SHIFTS",
								severity: "info",
								audience: "configuration",
								message: "Rest carried in.",
								entities: { employeeId: "mp-1", restedAt: "2026-10-12T09:00" },
							},
						],
					},
				}
			)
		);

		expect(issues).toEqual([
			expect.objectContaining({
				group: "forInformation",
				who: "scheduling.findings.codes.PRIOR_REST_BLOCKS_SHIFTS.label",
				memberProfileId: "mp-1",
				day: "2026-10-12",
				rule: "Rest carried in.",
			}),
		]);
	});

	it("lists a day to decide as to fix", () => {
		const [row] = scheduleAssignmentsFixture();
		if (!row) throw new Error("fixture changed");

		const issues = issuesOfRoster(
			input({}, { toDecide: [{ ...row, flag: "NEEDS_DECISION" }] })
		);

		expect(issues.map((issue) => [issue.group, issue.rule])).toEqual([
			[
				"mustFix",
				`scheduling.rosterEdit.needsDecision(${row.member?.displayName ?? ""})`,
			],
		]);
	});

	it("lists starting points and the lines above the list for information", () => {
		const issues = issuesOfRoster(
			input({
				startingRuns: new Map([["mp-1", 3]]),
				noteLines: [
					{
						title: "5 people's days changed",
						detail: "Regenerate to plan",
						topic: "Days before changed",
					},
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
			["mustFix", "scheduling.rulesCheck.unnamedRule"],
			["notMet", "Weekends off"],
		]);
		expect(issues[0]?.rule).toBe("scheduling.issues.brokenSomewhere");
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
		// A generation's error names no rule: that is what its advice goes by.
		expect(issues.map((issue) => issue.subject)).toEqual([
			{ kind: "generationError" },
			{ kind: "generationError" },
		]);
	});

	it("carries the rule behind a clash that names a person, and none for the roster's own lists", () => {
		const row = leaveGapRow();
		const clash = staffingGapFixture({
			employeeUuid: "mp-1",
			sourceRule: "at_most_one_role_assignment_per_day",
		});
		const issues = issuesOfRoster(
			input(
				{},
				{
					toDecide: [row],
					findings: { ...emptyFindingsFixture(), conflicts: [clash] },
				}
			)
		);

		expect(issues.map((issue) => issue.subject)).toEqual([
			undefined,
			{ kind: "rule", rule: "at_most_one_role_assignment_per_day" },
		]);
	});
});
