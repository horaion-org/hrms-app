import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	diagnosticLabel,
	diagnosticSentence,
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
			"Ben Ong has gone 5 days in a row without a Rest day or Day off before this schedule, so one is needed by day 2026-10-13."
		);
	});

	it("given_aRunCarriedInOfOneDay_when_worded_then_saysDay", () => {
		const diagnostic = dayTypeFinding("PRIOR_RUN_NEEDS_DAY_TYPE", {
			employeeId: "mp-2",
			daysWithoutDayTypesBefore: 1,
			dayTypeNeededBy: "2026-10-17",
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Ben Ong has gone 1 day in a row without a Rest day or Day off before this schedule, so one is needed by day 2026-10-17."
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

	it("given_daysBeforeOnlyPartlyKnown_when_worded_then_namesTheMemberCountsAndRule", () => {
		const diagnostic = dayTypeFinding("PRIOR_DAYS_UNKNOWN", {
			employeeId: "mp-2",
			knownDays: 3,
			lookBackDays: 14,
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"Only 3 of the 14 days before this schedule are known for Ben Ong, so the limit on days in a row is counted from what is known."
		);
	});

	it("given_noDayBeforeKnownForTheWholeSchedule_when_worded_then_namesOnlyTheRule", () => {
		const diagnostic = dayTypeFinding("PRIOR_DAYS_UNKNOWN", {
			knownDays: 0,
			lookBackDays: 14,
		});

		expect(diagnosticSentence(diagnostic, withDaysLimit, t, day)).toBe(
			"No days before this schedule are known, so the limit on days in a row is counted from its first day."
		);
	});

	it("given_aCodeTheAppDoesNotKnow_when_worded_then_isNull", () => {
		expect(
			diagnosticSentence(withCode("SHIFT_TOO_SHORT"), named, t, day)
		).toBeNull();
	});
});
