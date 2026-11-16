import { describe, expect, it } from "vitest";
import { constraintSectionsOf } from "@/features/scheduling/constraints/constraintSections";
import type { SectionedConstraint } from "@/features/scheduling/constraints/constraintSections";

/** A constraint with only what the sections read. */
const row = (
	name: string,
	category: SectionedConstraint["category"],
	requirement: SectionedConstraint["requirement"] = "MUST",
	level: SectionedConstraint["level"] = "DEPARTMENT"
): SectionedConstraint => ({ name, category, requirement, level });

const names = (rows: Array<SectionedConstraint>): Array<string> =>
	rows.map((each) => each.name);

describe("constraintSectionsOf", () => {
	it("given_constraintsOfSeveralPurposes_when_laidOut_then_oneSectionPerCategoryInTheApisOrder", () => {
		const laidOut = constraintSectionsOf(
			[
				row("Rest", "WORKING_HOURS"),
				row("Cover", "STAFFING"),
				row("Weekly off", "SHIFT_PATTERN"),
			],
			["STAFFING", "SHIFT_PATTERN", "WORKING_HOURS"],
			() => false
		);

		expect(laidOut.sections.map((section) => section.category)).toEqual([
			"STAFFING",
			"SHIFT_PATTERN",
			"WORKING_HOURS",
		]);
	});

	it("given_aCategoryTheOrderDoesNotName_when_laidOut_then_itFollowsAsFirstMet", () => {
		const laidOut = constraintSectionsOf(
			[row("Duty", "ROLE_COVERAGE"), row("Cover", "STAFFING")],
			["STAFFING"],
			() => false
		);

		expect(laidOut.sections.map((section) => section.category)).toEqual([
			"STAFFING",
			"ROLE_COVERAGE",
		]);
	});

	it("given_oneSection_when_laidOut_then_whatNeedsFixingFirstThenMustThenIfPossibleThenByName", () => {
		const laidOut = constraintSectionsOf(
			[
				row("Zeta", "STAFFING", "SHOULD"),
				row("Beta", "STAFFING", "MUST"),
				row("Alpha", "STAFFING", "SHOULD"),
				row("Broken", "STAFFING", "SHOULD"),
				row("Setting", "STAFFING", null),
			],
			["STAFFING"],
			(constraint) => constraint.name === "Broken"
		);

		expect(names(laidOut.sections[0]!.rows)).toEqual([
			"Broken",
			"Beta",
			"Alpha",
			"Zeta",
			"Setting",
		]);
		expect(names(laidOut.needingAttention)).toEqual(["Broken"]);
	});

	it("given_aCategoryWithNoneYet_when_laidOut_then_itsSectionIsEmpty", () => {
		const laidOut = constraintSectionsOf(
			[row("Cover", "STAFFING")],
			["STAFFING", "WORKING_HOURS"],
			() => false
		);

		expect(
			laidOut.sections.map((section) => [section.category, section.rows.length])
		).toEqual([
			["STAFFING", 1],
			["WORKING_HOURS", 0],
		]);
	});

	it("given_companyConstraints_when_laidOut_then_theyStandApartAndOpenNoSection", () => {
		const laidOut = constraintSectionsOf(
			[
				row("Company rest", "WORKING_HOURS", "MUST", "COMPANY"),
				row("Cover", "STAFFING"),
			],
			["STAFFING"],
			() => false
		);

		expect(laidOut.sections.map((section) => section.category)).toEqual([
			"STAFFING",
		]);
		expect(names(laidOut.company)).toEqual(["Company rest"]);
	});

	it("given_theWorkPolicyItself_when_laidOut_then_itsConstraintsFillTheSections", () => {
		const laidOut = constraintSectionsOf(
			[row("Company rest", "WORKING_HOURS", "MUST", "COMPANY")],
			["WORKING_HOURS"],
			() => false,
			false
		);

		expect(names(laidOut.sections[0]!.rows)).toEqual(["Company rest"]);
		expect(laidOut.company).toEqual([]);
	});
});
