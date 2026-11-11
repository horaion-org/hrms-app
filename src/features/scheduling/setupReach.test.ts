import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	companyConstraintFixture,
	constraintFixture,
} from "@/features/scheduling/constraints/fixtures";
import {
	constraintsNamingShift,
	deleteCopy,
	draftsUsing,
	editNote,
} from "@/features/scheduling/setupReach";

const t = authTestI18n.t;

const schedule = (
	status: "DRAFT" | "GENERATED" | "PUBLISHED",
	includedShiftIds: Array<string>,
	includedConstraintIds: Array<string> = []
): {
	status: "DRAFT" | "GENERATED" | "PUBLISHED";
	includedShiftIds: Array<string>;
	includedConstraintIds: Array<string>;
} => ({ status, includedShiftIds, includedConstraintIds });

describe("draftsUsing", () => {
	const schedules = [
		schedule("DRAFT", ["late"], ["rest"]),
		schedule("DRAFT", ["early"], ["rest"]),
		schedule("GENERATED", ["late"], ["rest"]),
		schedule("PUBLISHED", ["late"], ["rest"]),
	];

	it("given_schedulesOfEveryStatus_when_counted_then_countsOnlyDraftsTickingTheShift", () => {
		expect(draftsUsing(schedules, { kind: "shift", id: "late" })).toBe(1);
	});

	it("given_schedulesOfEveryStatus_when_counted_then_countsOnlyDraftsTickingTheConstraint", () => {
		expect(draftsUsing(schedules, { kind: "constraint", id: "rest" })).toBe(2);
		expect(draftsUsing(schedules, { kind: "constraint", id: "late" })).toBe(0);
	});
});

describe("constraintsNamingShift", () => {
	it("given_constraints_when_counted_then_countsDepartmentRowsWithTheShiftAndIgnoresTheRest", () => {
		const shiftValue = { field: "SHIFT" as const, value: "late", name: "Late" };
		const constraints = [
			constraintFixture({
				constraintId: "a",
				name: "Late cover",
				type: "SHIFT_STAFFING",
				values: [shiftValue],
			}),
			constraintFixture({
				constraintId: "b",
				name: "Other shift",
				type: "SHIFT_STAFFING",
				values: [{ ...shiftValue, value: "early" }],
			}),
			constraintFixture({
				constraintId: "c",
				name: "Job title named late",
				type: "SHIFT_STAFFING",
				values: [{ field: "JOB_TITLE", value: "late", name: "Late" }],
			}),
			companyConstraintFixture({
				constraintId: "d",
				name: "Company late",
				type: "SHIFT_STAFFING",
				lock: "LOCKED",
				values: [shiftValue],
			}),
		];

		expect(constraintsNamingShift(constraints, "late")).toBe(1);
	});
});

describe("editNote", () => {
	it.each([
		[
			0,
			"Saving changes this shift for Front Office and new schedules. Generated and published schedules keep their own copy.",
		],
		[
			1,
			"Saving changes this shift for Front Office: new schedules and 1 draft that uses it. Generated and published schedules keep their own copy.",
		],
		[
			3,
			"Saving changes this shift for Front Office: new schedules and 3 drafts that use it. Generated and published schedules keep their own copy.",
		],
		[
			undefined,
			"Saving changes this shift for Front Office, new schedules and any drafts that use it. Generated and published schedules keep their own copy.",
		],
	])("given_%s_drafts_when_editingAShift_then_saysSo", (count, text) => {
		expect(editNote(t, "shift", "Front Office", count)).toBe(text);
	});

	it.each([
		[
			0,
			"Saving changes this constraint for Bar and new schedules. Generated and published schedules keep their own copy.",
		],
		[
			1,
			"Saving changes this constraint for Bar: new schedules and 1 draft that uses it. Generated and published schedules keep their own copy.",
		],
		[
			2,
			"Saving changes this constraint for Bar: new schedules and 2 drafts that use it. Generated and published schedules keep their own copy.",
		],
		[
			undefined,
			"Saving changes this constraint for Bar, new schedules and any drafts that use it. Generated and published schedules keep their own copy.",
		],
	])("given_%s_drafts_when_editingAConstraint_then_saysSo", (count, text) => {
		expect(editNote(t, "constraint", "Bar", count)).toBe(text);
	});
});

describe("deleteCopy", () => {
	it.each([
		[
			0,
			"It's removed from Front Office. Generated and published schedules keep their copy.",
		],
		[
			1,
			"It's removed from Front Office and from 1 draft that uses it. Generated and published schedules keep their copy.",
		],
		[
			4,
			"It's removed from Front Office and from 4 drafts that use it. Generated and published schedules keep their copy.",
		],
		[
			undefined,
			"It's removed from Front Office and from any drafts that use it. Generated and published schedules keep their copy.",
		],
	])(
		"given_%s_drafts_when_deleting_then_saysWhatItIsRemovedFrom",
		(count, text) => {
			expect(
				deleteCopy(t, "constraint", "Rest", "Front Office", count)
			).toEqual({
				title: "Delete Rest?",
				description: text,
				confirmLabel: "Delete constraint",
			});
		}
	);

	it("given_constraintsNamingTheShift_when_deleting_then_addsThatTheyStopApplying", () => {
		expect(deleteCopy(t, "shift", "Late", "Bar", 0, 1).description).toBe(
			"It's removed from Bar. Generated and published schedules keep their copy. 1 constraint names this shift; it will stop applying to it."
		);
		expect(deleteCopy(t, "shift", "Late", "Bar", 0, 2).description).toBe(
			"It's removed from Bar. Generated and published schedules keep their copy. 2 constraints name this shift; they'll stop applying to it."
		);
		expect(deleteCopy(t, "shift", "Late", "Bar", 0, 0)).toEqual({
			title: "Delete Late?",
			description:
				"It's removed from Bar. Generated and published schedules keep their copy.",
			confirmLabel: "Delete shift",
		});
	});
});
