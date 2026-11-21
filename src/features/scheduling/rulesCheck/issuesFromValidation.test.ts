import { describe, expect, it } from "vitest";
import {
	ruleFixture,
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	brokenRuleIssueCount,
	checkDue,
	checkPending,
	changesUnchecked,
	findingsShown,
	scheduleWithFindingsShown,
	validatesOnOpen,
	validationStanding,
} from "@/features/scheduling/rulesCheck/issuesFromValidation";
import {
	generationFindingsFixture,
	generationFixture,
	scheduleFixture,
} from "@/features/scheduling/schedules/fixtures";

const findings = generationFindingsFixture();

describe("validationStanding", () => {
	it.each([
		[
			"as generated, never changed nor validated",
			undefined,
			false,
			"asGenerated",
		],
		[
			"out of date, changed by hand and never validated",
			undefined,
			true,
			"outOfDate",
		],
		["out of date, validated at an earlier revision", 0, false, "outOfDate"],
		["current, validated at the revision on screen", 1, true, "current"],
	] as const)("reads %s", (_case, lastRevision, hasChanges, expected) => {
		expect(
			validationStanding({
				revision: 1,
				last:
					lastRevision === undefined
						? undefined
						: { revision: lastRevision, check: rulesCheckFixture() },
				hasChanges,
			})
		).toBe(expected);
	});
});

describe("changesUnchecked", () => {
	const last = { revision: 1, check: rulesCheckFixture() };

	it.each([
		[
			"out of date, never validated in this visit",
			"outOfDate",
			undefined,
			true,
		],
		["out of date, validated at an earlier revision", "outOfDate", last, false],
		["as generated", "asGenerated", undefined, false],
		["current", "current", last, false],
	] as const)("reads %s", (_case, standing, lastValidation, expected) => {
		expect(changesUnchecked(standing, lastValidation)).toBe(expected);
	});
});

describe("checkDue and checkPending", () => {
	const last = { revision: 1, check: rulesCheckFixture() };
	it.each<
		[string, Parameters<typeof checkDue>[0], { due: boolean; pending: boolean }]
	>([
		[
			"the roster moved past the last check, nothing asked",
			{ status: "idle", last, revision: 2 },
			{ due: true, pending: true },
		],
		[
			"asked at the new revision",
			{ status: "loading", last, revision: 2 },
			{ due: false, pending: true },
		],
		[
			"refused at the new revision",
			{ status: "refused", last, revision: 2 },
			{ due: false, pending: false },
		],
		[
			"the last check is the roster's",
			{ status: "idle", last, revision: 1 },
			{ due: false, pending: false },
		],
		[
			"nothing checked in this visit",
			{ status: "idle", last: undefined, revision: 2 },
			{ due: false, pending: false },
		],
	])("%s", (_case, validation, expected) => {
		expect({
			due: checkDue(validation),
			pending: checkPending(validation),
		}).toEqual(expected);
	});
});

describe("validatesOnOpen", () => {
	const last = { revision: 1, check: rulesCheckFixture() };

	it.each([
		[
			"hand changes, nothing asked: asks",
			true,
			undefined,
			true,
			undefined,
			true,
		],
		[
			"without leave to validate: never",
			false,
			undefined,
			true,
			undefined,
			false,
		],
		[
			"no hand changes: nothing to check",
			true,
			undefined,
			false,
			undefined,
			false,
		],
		[
			"validated in this visit: the button takes over",
			true,
			last,
			true,
			undefined,
			false,
		],
		["already asked at this revision: once", true, undefined, true, 2, false],
		[
			"asked at an earlier revision: asks again",
			true,
			undefined,
			true,
			1,
			true,
		],
	] as const)(
		"%s",
		(_case, mayValidate, lastValidation, hasChanges, askedAt, expected) => {
			expect(
				validatesOnOpen({
					mayValidate,
					revision: 2,
					last: lastValidation,
					hasChanges,
					askedAt,
				})
			).toBe(expected);
		}
	);
});

describe("findingsShown", () => {
	it("keeps the generation's findings when nothing was validated or staffing was not worked out", () => {
		expect(findingsShown(findings, undefined)).toBe(findings);
		expect(
			findingsShown(findings, {
				revision: 1,
				check: rulesCheckFixture({ staffingGaps: null }),
			})
		).toBe(findings);
	});

	it("puts the validation's gaps in place of the generation's conflicts, keeping its other findings", () => {
		const gap = staffingGapFixture({ conflictId: "new" });

		const shown = findingsShown(findings, {
			revision: 1,
			check: rulesCheckFixture({ staffingGaps: [gap] }),
		});

		expect(shown?.conflicts).toEqual([gap]);
		expect(shown?.diagnostics).toEqual(findings.diagnostics);
	});
});

describe("brokenRuleIssueCount", () => {
	it("counts one per rule named, one when broken with none named, none otherwise", () => {
		const broken = rulesCheckFixture({
			status: "BROKEN",
			brokenRules: [
				{
					rule: "most_days_a_week",
					constraintId: null,
					constraintName: null,
					violations: null,
				},
				{
					rule: "most_minutes_a_day",
					constraintId: null,
					constraintName: null,
					violations: null,
				},
			],
		});
		expect(brokenRuleIssueCount({ revision: 1, check: broken })).toBe(2);
		expect(
			brokenRuleIssueCount({
				revision: 1,
				check: rulesCheckFixture({ status: "BROKEN" }),
			})
		).toBe(1);
		expect(brokenRuleIssueCount(undefined)).toBe(0);
	});
});

describe("scheduleWithFindingsShown", () => {
	const validated = {
		revision: 1,
		check: rulesCheckFixture({ staffingGaps: [staffingGapFixture()] }),
	};

	it("swaps the validation's gaps into the generation's findings", () => {
		const schedule = scheduleFixture({
			generation: generationFixture({ findings }),
		});

		const shown = scheduleWithFindingsShown(schedule, validated);

		expect(shown.generation?.findings?.conflicts).toEqual([
			staffingGapFixture(),
		]);
		expect(shown.generation?.findings?.errors).toEqual(findings.errors);
	});

	it("keeps the same schedule when nothing was validated or there is no generation", () => {
		const schedule = scheduleFixture({
			generation: generationFixture({ findings }),
		});
		const ungenerated = scheduleFixture({ generation: null });

		expect(scheduleWithFindingsShown(schedule, undefined)).toBe(schedule);
		expect(scheduleWithFindingsShown(ungenerated, validated)).toBe(ungenerated);
	});
});

describe("a validation that says who (ADR-0094)", () => {
	const lina = {
		memberProfileId: "mp-lina",
		membershipId: "m-lina",
		displayName: "Lina Tan",
	};
	const over = {
		employeeId: "mp-lina",
		date: "2026-10-16",
		messages: ["Over"],
	};
	const saysWho = rulesCheckFixture({
		status: "BROKEN",
		brokenRules: [
			ruleFixture({ violations: [over] }),
			ruleFixture({ rule: "most_days_a_week", violations: null }),
		],
		notMet: [
			ruleFixture({
				rule: "max_consecutive_work_days",
				violations: [
					{
						employeeId: "mp-lina",
						date: null,
						messages: ["If possible, not met: five"],
					},
				],
			}),
		],
		members: [lina],
	});

	it("puts the broken musts' people and days in place of the generation's violations, and names them", () => {
		const shown = findingsShown(findings, { revision: 1, check: saysWho });

		expect(shown?.errors).toEqual([over]);
		expect(shown?.members).toEqual([...findings.members, lina]);
		// The rules not met if possible are never findings: Issues lists them apart.
		expect(JSON.stringify(shown)).not.toContain("If possible, not met");
	});

	it("keeps the generation's violations for a check that does not say who", () => {
		const older = rulesCheckFixture({ status: "BROKEN", notMet: null });

		expect(
			findingsShown(findings, { revision: 1, check: older })?.errors
		).toEqual(findings.errors);
	});

	it("counts a broken must once: by its people and days, or by its name when it lists none", () => {
		expect(brokenRuleIssueCount({ revision: 1, check: saysWho })).toBe(1);
		expect(
			brokenRuleIssueCount({
				revision: 1,
				check: rulesCheckFixture({ status: "BROKEN", notMet: [] }),
			})
		).toBe(1);
		// Holding, with rules not met if possible: nothing broken to count.
		expect(
			brokenRuleIssueCount({
				revision: 1,
				check: { ...saysWho, status: "HOLDS", brokenRules: [] },
			})
		).toBe(0);
	});
});
