import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	diagnosticLabel,
	diagnosticSentence,
	diagnosticSubject,
	groupDiagnostics,
} from "@/features/scheduling/roster/findings/diagnostics";
import {
	findingNames,
	type FindingNames,
} from "@/features/scheduling/roster/findings/findingNames";
import type { FindingsDiagnostic } from "@/features/scheduling/schedules/api";
import {
	findingsOfEveryKindFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

const findings = findingsOfEveryKindFixture();
const named: FindingNames = findingNames(findings, {
	assignments: scheduleAssignmentsFixture(),
	shifts: frozenShiftsFixture(),
	constraints: [],
});
const unnamed: FindingNames = findingNames(
	{ members: [] },
	{ assignments: [], shifts: [], constraints: [] }
);
const withCode = (code: string): FindingsDiagnostic =>
	findings.diagnostics.find((diagnostic) => diagnostic.code === code)!;
/** Writes a date as the test reads it; the list writes it as `formatDay` does. */
const day = (isoDate: string): string => `day ${isoDate}`;

/** The schedule's frozen days limit: 6 days in a row without a Rest day or a Day off. */
const DAYS_LIMIT_COPY = {
	constraintId: "days-limit-copy",
	name: "Days in a row",
	values: [
		{ field: "DAYS_IN_A_ROW" as const, value: "6", name: null },
		{ field: "DAY_TYPE" as const, value: "REST", name: null },
		{ field: "DAY_TYPE" as const, value: "OFF", name: null },
	],
};
const withDaysLimit: FindingNames = findingNames(findings, {
	assignments: [],
	shifts: [],
	constraints: [DAYS_LIMIT_COPY],
});

/** A day-type finding of the engine's, about the days limit unless told otherwise. */
const dayTypeFinding = (
	code: string,
	entities: Record<string, unknown>
): FindingsDiagnostic => ({
	code,
	severity: "warning",
	audience: "configuration",
	message: "As the engine words it.",
	entities: {
		ruleId: "days-limit-copy",
		dayTypeIds: ["engine-rest", "engine-off"],
		maxDays: 6,
		...entities,
	},
});

describe("groupDiagnostics", () => {
	it("given_diagnostics_when_grouped_then_oneGroupPerCodeWhereItFirstAppears", () => {
		const twice = [...findings.diagnostics, withCode("DEAD_SHIFT")];

		expect(
			groupDiagnostics(twice).map(({ code, diagnostics }) => [
				code,
				diagnostics.length,
			])
		).toEqual([
			["UNCOVERABLE_DEMAND", 1],
			["RULE_REFERENCES_MISSING_ENTITY", 1],
			["UNASSIGNABLE_EMPLOYEE", 1],
			["DEAD_SHIFT", 2],
			["SHIFT_TOO_SHORT", 1],
		]);
	});
});

describe("diagnosticLabel", () => {
	it.each([
		["UNCOVERABLE_DEMAND", "Demand no shift can cover"],
		["RULE_REFERENCES_MISSING_ENTITY", "Rules naming missing items"],
		["UNASSIGNABLE_EMPLOYEE", "Members no shift fits"],
		["DEAD_SHIFT", "Shifts nobody can take"],
		["PRIOR_RUN_NEEDS_DAY_TYPE", "Run carried in from before"],
		["PRIOR_DAYS_UNKNOWN", "Days before not known"],
		["SHIFT_TOO_SHORT", "Shift too short"],
	])("given_%s_when_labelled_then_reads_%s", (code, label) => {
		expect(diagnosticLabel(code, t)).toBe(label);
	});
});

describe("diagnosticSentence", () => {
	it.each([
		[
			"UNCOVERABLE_DEMAND",
			"No shift can cover part of the demand for Front Desk Staff.",
		],
		[
			"RULE_REFERENCES_MISSING_ENTITY",
			"People on a shift, with stand-ins names 2 items that aren’t in this schedule.",
		],
		[
			"UNASSIGNABLE_EMPLOYEE",
			"Ben Ong can only be scheduled off: no shift fits their job title and availability.",
		],
		["DEAD_SHIFT", "No one in this schedule can take Breakfast Prep."],
	])(
		"given_%s_withNames_when_worded_then_namesWhatItIsAbout",
		(code, sentence) => {
			expect(diagnosticSentence(withCode(code), named, t, day)).toBe(sentence);
		}
	);

	it.each([
		[
			"UNCOVERABLE_DEMAND",
			"No shift can cover part of the demand for one job title.",
		],
		[
			"UNASSIGNABLE_EMPLOYEE",
			"A former member can only be scheduled off: no shift fits their job title and availability.",
		],
		["DEAD_SHIFT", "No one in this schedule can take one of its shifts."],
	])(
		"given_%s_withoutNames_when_worded_then_saysItGenerally",
		(code, sentence) => {
			expect(diagnosticSentence(withCode(code), unnamed, t, day)).toBe(
				sentence
			);
		}
	);

	it("given_aRuleWithoutItsNameOrMissingList_when_worded_then_saysItGenerally", () => {
		const diagnostic = {
			...withCode("RULE_REFERENCES_MISSING_ENTITY"),
			entities: { missing: ["one"] },
		};

		expect(diagnosticSentence(diagnostic, unnamed, t, day)).toBe(
			"One of its rules names 1 item that isn’t in this schedule."
		);
	});

	it("given_aRunCarriedIn_when_worded_then_namesTheMemberDaysDayTypesAndDate", () => {
		const diagnostic = dayTypeFinding("PRIOR_RUN_NEEDS_DAY_TYPE", {
			employeeId: "mp-2",
			daysWithoutDayTypesBefore: 5,
			dayTypeNeededBy: "2026-10-13",
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Days in a row: Ben Ong has gone 5 days in a row without a Rest day or Day off before this schedule, so one is needed by day 2026-10-13."
		);
	});

	it("given_aRunCarriedInOfOneDay_when_worded_then_saysDay", () => {
		const diagnostic = dayTypeFinding("PRIOR_RUN_NEEDS_DAY_TYPE", {
			employeeId: "mp-2",
			daysWithoutDayTypesBefore: 1,
			dayTypeNeededBy: "2026-10-17",
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Days in a row: Ben Ong has gone 1 day in a row without a Rest day or Day off before this schedule, so one is needed by day 2026-10-17."
		);
	});

	it("given_aRunCarriedInFromARuleThatDoesNotResolve_when_worded_then_namesNoDayType", () => {
		const diagnostic = dayTypeFinding("PRIOR_RUN_NEEDS_DAY_TYPE", {
			employeeId: "mp-9",
			ruleId: "not-listed",
			daysWithoutDayTypesBefore: 5,
			dayTypeNeededBy: "2026-10-13",
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"A former member has gone 5 days in a row before this schedule, so a day off under one of its rules is needed by day 2026-10-13."
		);
	});

	it("given_aRunCarriedInOfOneDayFromARuleThatDoesNotResolve_when_worded_then_saysDay", () => {
		const diagnostic = dayTypeFinding("PRIOR_RUN_NEEDS_DAY_TYPE", {
			employeeId: "mp-2",
			ruleId: "not-listed",
			daysWithoutDayTypesBefore: 1,
			dayTypeNeededBy: "2026-10-17",
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Ben Ong has gone 1 day in a row before this schedule, so a day off under one of its rules is needed by day 2026-10-17."
		);
	});

	it("given_restCarriedInFromBefore_when_worded_then_saysWhenTheMemberMayFirstStartAndWhy", () => {
		const diagnostic = {
			...withCode("DEAD_SHIFT"),
			code: "PRIOR_REST_BLOCKS_SHIFTS",
			severity: "info",
			entities: {
				employeeId: "mp-2",
				date: "2026-10-12",
				shiftIds: ["front-desk-am"],
				previousShiftEnd: "2026-10-11T22:00",
				restedAt: "2026-10-12T09:00",
				minimumRestHours: 11,
			},
		};

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Ben Ong can only start from 09:00 on day 2026-10-12, because of rest after their last shift, which ended day 2026-10-11 at 22:00."
		);
	});

	it("given_restBeforeTheNextShiftAfterTheSchedule_when_worded_then_saysByWhenShiftsMustEndAndWhy", () => {
		const diagnostic = {
			...withCode("DEAD_SHIFT"),
			code: "NEXT_SHIFT_REST_BLOCKS_SHIFTS",
			severity: "info",
			entities: {
				employeeId: "mp-2",
				date: "2026-10-18",
				shiftIds: ["front-desk-pm"],
				nextShiftStart: "2026-10-19T06:00",
				mustEndBy: "2026-10-18T19:00",
				minimumRestHours: 11,
			},
		};

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Ben Ong can only work shifts that end by 19:00 on day 2026-10-18, because of rest before their next shift after this schedule, which started day 2026-10-19 at 06:00 when this schedule was generated."
		);
		expect(diagnosticLabel("NEXT_SHIFT_REST_BLOCKS_SHIFTS", t)).toBe(
			"Rest needed before the next schedule"
		);
	});

	it("given_restBeforeTheNextShiftWithoutItsStart_when_worded_then_theStartIsLeftEmptyAsPriorRestLeavesItsEnd", () => {
		const diagnostic = {
			...withCode("DEAD_SHIFT"),
			code: "NEXT_SHIFT_REST_BLOCKS_SHIFTS",
			entities: { employeeId: "mp-2", mustEndBy: "2026-10-18T19:00" },
		};

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Ben Ong can only work shifts that end by 19:00 on day 2026-10-18, because of rest before their next shift after this schedule, which started  at  when this schedule was generated."
		);
	});

	it("given_daysBeforeOnlyPartlyKnown_when_worded_then_namesTheMemberCountsAndRule", () => {
		const diagnostic = dayTypeFinding("PRIOR_DAYS_UNKNOWN", {
			employeeId: "mp-2",
			knownDays: 3,
			lookBackDays: 14,
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Days in a row: Only 3 of the 14 days before this schedule are known for Ben Ong, so the limit on days in a row is counted from what is known."
		);
	});

	it("given_noDayBeforeKnownForTheWholeSchedule_when_worded_then_namesOnlyTheRule", () => {
		const diagnostic = dayTypeFinding("PRIOR_DAYS_UNKNOWN", {
			knownDays: 0,
			lookBackDays: 14,
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Days in a row: No days before this schedule are known, so the limit on days in a row is counted from its first day."
		);
	});

	it("given_noDayBeforeKnownUnderTwoRules_when_worded_then_eachLineNamesItsOwnRule", () => {
		const twoLimits = findingNames(findings, {
			assignments: [],
			shifts: [],
			constraints: [
				DAYS_LIMIT_COPY,
				{ ...DAYS_LIMIT_COPY, constraintId: "six-copy", name: "Six at most" },
			],
		});
		const sentences = ["days-limit-copy", "six-copy"].map((ruleId) =>
			diagnosticSentence(
				dayTypeFinding("PRIOR_DAYS_UNKNOWN", { ruleId, knownDays: 0 }),
				twoLimits,
				t,
				day
			)
		);

		expect(sentences).toEqual([
			"Days in a row: No days before this schedule are known, so the limit on days in a row is counted from its first day.",
			"Six at most: No days before this schedule are known, so the limit on days in a row is counted from its first day.",
		]);
	});

	it("given_daysOfADaysOffBlockNotSent_when_worded_then_namesTheMemberAndSaysHowTheyCount", () => {
		const diagnostic = dayTypeFinding("OFF_BLOCK_HISTORY_MISSING", {
			employeeId: "mp-2",
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Ben Ong: some days before this schedule in a days-off period were not filled in, so they are counted as worked. Fill them in if a day off was given then."
		);
		expect(diagnosticLabel("OFF_BLOCK_HISTORY_MISSING", t)).toBe(
			"Days before not filled in"
		);
	});

	it("given_aCodeTheAppDoesNotKnow_when_worded_then_isNull", () => {
		expect(
			diagnosticSentence(withCode("SHIFT_TOO_SHORT"), named, t, day)
		).toBeNull();
	});
});

describe("diagnosticSubject", () => {
	const restCarriedIn: FindingsDiagnostic = {
		...withCode("DEAD_SHIFT"),
		code: "PRIOR_REST_BLOCKS_SHIFTS",
		entities: { employeeId: "mp-2", restedAt: "2026-10-12T09:00" },
	};

	it("given_aMemberAndARestDay_when_read_then_isThePersonOnThatDay", () => {
		expect(diagnosticSubject(restCarriedIn, named, t)).toEqual({
			who: "Ben Ong",
			memberProfileId: "mp-2",
			day: "2026-10-12",
		});
	});

	it("given_restBeforeTheNextShift_when_read_then_isThePersonOnTheDayTheirShiftsMustEndBy", () => {
		const restBeforeNext: FindingsDiagnostic = {
			...withCode("DEAD_SHIFT"),
			code: "NEXT_SHIFT_REST_BLOCKS_SHIFTS",
			entities: { employeeId: "mp-2", mustEndBy: "2026-10-18T19:00" },
		};

		expect(diagnosticSubject(restBeforeNext, named, t)).toEqual({
			who: "Ben Ong",
			memberProfileId: "mp-2",
			day: "2026-10-18",
		});
		expect(diagnosticSubject(restBeforeNext, unnamed, t).who).toBe(
			"Rest needed before the next schedule"
		);
	});

	it("given_aShift_when_read_then_isTheShiftWithNoDay", () => {
		expect(diagnosticSubject(withCode("DEAD_SHIFT"), named, t)).toEqual({
			who: "Breakfast Prep",
			memberProfileId: null,
			day: null,
		});
	});

	it("given_aRunNeedingADayType_when_read_then_isOnTheDayItIsNeededBy", () => {
		const diagnostic = dayTypeFinding("PRIOR_RUN_NEEDS_DAY_TYPE", {
			employeeId: "mp-2",
			dayTypeNeededBy: "2026-10-17",
		});

		expect(diagnosticSubject(diagnostic, named, t).day).toBe("2026-10-17");
	});

	it("given_namesThatDoNotResolve_when_read_then_isTheKindOfNote", () => {
		expect(diagnosticSubject(restCarriedIn, unnamed, t).who).toBe(
			"Rest carried in from before"
		);
		expect(diagnosticSubject(withCode("DEAD_SHIFT"), null, t).who).toBe(
			"Shifts nobody can take"
		);
	});
});
