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
			"Shift staffing with stand-ins names 2 items that aren’t in this schedule.",
		],
		[
			"UNASSIGNABLE_EMPLOYEE",
			"Ben Ong can only be scheduled off: no shift fits their job title and availability.",
		],
		["DEAD_SHIFT", "No one in this schedule can take Breakfast Prep."],
	])(
		"given_%s_withNames_when_worded_then_namesWhatItIsAbout",
		(code, sentence) => {
			expect(diagnosticSentence(withCode(code), named, t)).toBe(sentence);
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
			expect(diagnosticSentence(withCode(code), unnamed, t)).toBe(sentence);
		}
	);

	it("given_aRuleWithoutItsNameOrMissingList_when_worded_then_saysItGenerally", () => {
		const diagnostic = {
			...withCode("RULE_REFERENCES_MISSING_ENTITY"),
			entities: { missing: ["one"] },
		};

		expect(diagnosticSentence(diagnostic, unnamed, t)).toBe(
			"One of its rules names 1 item that isn’t in this schedule."
		);
	});

	it("given_aCodeTheAppDoesNotKnow_when_worded_then_isNull", () => {
		expect(
			diagnosticSentence(withCode("SHIFT_TOO_SHORT"), named, t)
		).toBeNull();
	});
});
