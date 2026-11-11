import { describe, expect, it } from "vitest";
import type { ConstraintValue } from "@/features/scheduling/constraints/api";
import {
	companyConstraintFixture,
	constraintFixture,
} from "@/features/scheduling/constraints/fixtures";
import { shiftFixture } from "@/features/scheduling/shifts/fixtures";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	allOf,
	isSelectable,
	noteOf,
	usesLineOf,
	usesSummary,
	weekChoiceProblem,
	withShiftsChosen,
} from "@/features/scheduling/weekChoice";

const shiftValue = (shiftId: string, name: string): ConstraintValue => ({
	field: "SHIFT",
	value: shiftId,
	name,
});

const OPENING = shiftFixture({ shiftId: "opening", name: "Opening" });
const CLOSING = shiftFixture({ shiftId: "closing", name: "Closing" });
const SUNDAY = shiftFixture({ shiftId: "sunday", name: "Sunday" });
const SHIFTS = [OPENING, CLOSING, SUNDAY];
const SHIFT_IDS = SHIFTS.map((shift) => shift.shiftId);

const OPENING_COVER = constraintFixture({
	constraintId: "opening-cover",
	name: "Opening cover",
	type: "SHIFT_STAFFING",
	requiresPeople: true,
	values: [shiftValue("opening", "Opening")],
});
const SUNDAY_COVER = constraintFixture({
	constraintId: "sunday-cover",
	name: "Sunday cover",
	type: "SHIFT_STAFFING",
	requiresPeople: true,
	values: [shiftValue("sunday", "Sunday")],
});
const EVENING_PAIR = constraintFixture({
	constraintId: "evening-pair",
	name: "Evening pair",
	type: "ROLE_PRESENCE",
	requiresPeople: true,
	values: [shiftValue("closing", "Closing"), shiftValue("sunday", "Sunday")],
});
const REST = constraintFixture({
	constraintId: "rest",
	name: "Rest",
	type: "REST_BETWEEN_SHIFTS",
	values: [{ field: "REST_HOURS", value: "10", name: null }],
});
const COMPANY_REST = companyConstraintFixture({
	constraintId: "company-rest",
	name: "Company rest",
	type: "REST_BETWEEN_SHIFTS",
	lock: "LOCKED",
	values: [{ field: "REST_HOURS", value: "11", name: null }],
});
const INACTIVE = constraintFixture({
	constraintId: "inactive",
	name: "Inactive",
	type: "REST_BETWEEN_SHIFTS",
	status: "INACTIVE",
	values: [],
});
const CONSTRAINTS = [
	OPENING_COVER,
	SUNDAY_COVER,
	EVENING_PAIR,
	REST,
	COMPANY_REST,
	INACTIVE,
];

describe("allOf", () => {
	it("chooses every shift and every listed constraint by default", () => {
		expect(allOf(SHIFTS, CONSTRAINTS)).toEqual({
			shiftIds: ["opening", "closing", "sunday"],
			constraintIds: [
				"opening-cover",
				"sunday-cover",
				"evening-pair",
				"rest",
				"company-rest",
			],
		});
	});

	it("leaves out a company constraint the department replaced", () => {
		const replaced = { ...COMPANY_REST, overriddenByConstraintId: "rest" };

		expect(allOf(SHIFTS, [replaced, REST]).constraintIds).toEqual(["rest"]);
	});
});

describe("withShiftsChosen", () => {
	const all = allOf(SHIFTS, CONSTRAINTS);

	it("switches off Sunday cover when Sunday is unticked, naming the shift", () => {
		const choice = withShiftsChosen(all, ["opening", "closing"], CONSTRAINTS);

		expect(choice.constraintIds).not.toContain("sunday-cover");
		expect(noteOf(SUNDAY_COVER, choice.shiftIds, SHIFT_IDS)).toEqual({
			kind: "leavesOut",
			shiftNames: ["Sunday"],
		});
		expect(isSelectable(SUNDAY_COVER, choice.shiftIds)).toBe(false);
	});

	it("switches off a two-shift constraint when one of its shifts is left out", () => {
		const choice = withShiftsChosen(all, ["opening", "closing"], CONSTRAINTS);

		expect(choice.constraintIds).not.toContain("evening-pair");
		expect(noteOf(EVENING_PAIR, choice.shiftIds, SHIFT_IDS)).toEqual({
			kind: "leavesOut",
			shiftNames: ["Sunday"],
		});
	});

	it("keeps a locked constraint chosen, and it can never be unticked", () => {
		const choice = withShiftsChosen(all, [], CONSTRAINTS);

		expect(choice.constraintIds).toEqual(["rest", "company-rest"]);
		expect(isSelectable(COMPANY_REST, SHIFT_IDS)).toBe(false);
		expect(noteOf(COMPANY_REST, SHIFT_IDS, SHIFT_IDS)).toEqual({
			kind: "locked",
		});
	});
});

describe("noteOf", () => {
	it("gives no note to a constraint every chosen shift serves", () => {
		expect(noteOf(OPENING_COVER, SHIFT_IDS, SHIFT_IDS)).toBeUndefined();
		expect(noteOf(REST, [], SHIFT_IDS)).toBeUndefined();
	});

	it("says a named shift no longer exists when it is not listed at all", () => {
		expect(noteOf(SUNDAY_COVER, ["opening"], ["opening"])).toEqual({
			kind: "shiftGone",
		});
	});
});

describe("weekChoiceProblem", () => {
	it("asks for a shift when none is chosen", () => {
		expect(
			weekChoiceProblem({ shiftIds: [], constraintIds: ["rest"] }, CONSTRAINTS)
		).toBe("noShift");
	});

	it("asks for a staffing constraint when no chosen one requires people", () => {
		expect(
			weekChoiceProblem(
				{ shiftIds: ["opening"], constraintIds: ["rest", "company-rest"] },
				CONSTRAINTS
			)
		).toBe("noStaffing");
	});

	it("finds no problem when a chosen constraint requires people", () => {
		expect(weekChoiceProblem(allOf(SHIFTS, CONSTRAINTS), CONSTRAINTS)).toBe(
			undefined
		);
	});
});

describe("usesSummary", () => {
	it("counts the chosen against the listed, leaving inactive ones out", () => {
		const choice = withShiftsChosen(
			allOf(SHIFTS, CONSTRAINTS),
			["opening", "closing"],
			CONSTRAINTS
		);

		expect(usesSummary(choice, SHIFTS, CONSTRAINTS)).toEqual({
			shiftsChosen: 2,
			shiftsTotal: 3,
			constraintsChosen: 3,
			constraintsTotal: 5,
		});
	});
});

describe("usesLineOf", () => {
	const t = authTestI18n.t;
	const summary = (
		shiftsChosen: number,
		constraintsChosen: number
	): Parameters<typeof usesLineOf>[1] => ({
		shiftsChosen,
		shiftsTotal: 3,
		constraintsChosen,
		constraintsTotal: 5,
	});

	it("says all once when everything is used", () => {
		expect(usesLineOf(t, summary(3, 5), "Kitchen", false)).toBe(
			"Uses all 3 shifts and 5 constraints of Kitchen."
		);
	});

	it("counts what is used of each when something is left out", () => {
		expect(usesLineOf(t, summary(2, 4), "Kitchen", false)).toBe(
			"Uses 2 of 3 shifts and 4 of 5 constraints of Kitchen."
		);
		expect(usesLineOf(t, summary(3, 4), "Kitchen", false)).toBe(
			"Uses all 3 shifts and 4 of 5 constraints of Kitchen."
		);
	});

	it("speaks of its one shift and constraint", () => {
		expect(
			usesLineOf(
				t,
				{
					shiftsChosen: 1,
					shiftsTotal: 1,
					constraintsChosen: 0,
					constraintsTotal: 1,
				},
				"Kitchen",
				false
			)
		).toBe("Uses its 1 shift and 0 of 1 constraints of Kitchen.");
	});

	it("says what a generated schedule was made with", () => {
		expect(usesLineOf(t, summary(2, 1), "Kitchen", true)).toBe(
			"Generated with 2 shifts and 1 constraint."
		);
	});
});
