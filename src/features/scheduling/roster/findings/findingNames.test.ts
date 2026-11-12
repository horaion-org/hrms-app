import { describe, expect, it } from "vitest";
import { frozenConstraintsFixture } from "@/features/scheduling/constraints/fixtures";
import { findingNames } from "@/features/scheduling/roster/findings/findingNames";
import {
	findingsOfEveryKindFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import {
	frozenShiftsFixture,
	shiftCopyId,
} from "@/features/scheduling/shifts/fixtures";

const findings = findingsOfEveryKindFixture();

describe("findingNames", () => {
	it("given_theRosterAndItsSetup_when_named_then_namesMembersShiftsJobTitlesAndRules", () => {
		const names = findingNames(findings, {
			assignments: scheduleAssignmentsFixture(),
			shifts: frozenShiftsFixture(),
			constraints: frozenConstraintsFixture(),
		});

		expect(names.members.get("mp-2")).toBe("Ben Ong");
		expect(names.shifts.get(shiftCopyId("breakfast-prep"))).toBe(
			"Breakfast Prep"
		);
		expect(names.jobTitles.get("front-desk-staff")).toBe("Front Desk Staff");
		expect(names.rules.get("morning-cover-copy")).toBe("Morning cover");
	});

	it("given_rulesAboutDayTypes_when_named_then_keepsEachRulesDayTypesOnly", () => {
		const names = findingNames(findings, {
			assignments: [],
			shifts: [],
			constraints: [
				...frozenConstraintsFixture(),
				{
					constraintId: "days-limit-copy",
					name: "Days in a row",
					values: [
						{ field: "DAYS_IN_A_ROW", value: "6", name: null },
						{ field: "DAY_TYPE", value: "REST", name: null },
						{ field: "DAY_TYPE", value: "OFF", name: null },
					],
				},
			],
		});

		expect(names.ruleDayTypes.get("days-limit-copy")).toEqual(["REST", "OFF"]);
		expect(names.ruleDayTypes.has("morning-cover-copy")).toBe(false);
		expect(names.ruleDayTypes.size).toBe(1);
	});

	it("given_onlyTheRoster_when_named_then_namesWhatTheRosterWorks", () => {
		const names = findingNames(findings, {
			assignments: scheduleAssignmentsFixture(),
			shifts: [],
			constraints: [],
		});

		expect(names.shifts.get(shiftCopyId("lunch-rush"))).toBe("Lunch Rush");
		expect(names.shifts.has(shiftCopyId("breakfast-prep"))).toBe(false);
		expect(names.jobTitles.get("cashier")).toBe("Cashier");
		expect(names.rules.size).toBe(0);
	});

	it("given_aMemberWhoNoLongerResolves_when_named_then_leavesThemUnnamed", () => {
		const names = findingNames(findings, {
			assignments: [],
			shifts: [],
			constraints: [],
		});

		expect(names.members.has("mp-9")).toBe(false);
	});
});
