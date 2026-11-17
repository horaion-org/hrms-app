import { describe, expect, it } from "vitest";
import type { Gate } from "@/features/scheduling/readiness/readinessCopy";
import { setupLinksOf } from "@/features/scheduling/readiness/setupLinks";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

const KITCHEN = { branchId: "b-1", departmentId: "d-1" };

/** A permission check that answers yes to exactly `keys`. */
const holding =
	(...keys: Array<PermissionKey>) =>
	(key: PermissionKey): boolean =>
		keys.includes(key);

const SHIFTS_LINK = {
	to: "/scheduling",
	search: { view: "shifts", branch: "b-1", department: "d-1" },
};
const CONSTRAINTS_LINK = {
	to: "/scheduling",
	search: { view: "constraints", branch: "b-1", department: "d-1" },
};

/** A Setup gate for a Department with nothing set up, linking to its shifts. */
const NOTHING_GATE: Gate = {
	messageKey: "scheduling.gate.nothing",
	linkTo: "shifts",
	linkKey: "scheduling.gate.setUp",
	nextNoteKey: "scheduling.gate.nothingNote",
	department: "Kitchen",
};
/** A Generate gate for a Department missing its staffing constraint. */
const NO_STAFFING_GATE: Gate = {
	messageKey: "scheduling.gate.noLongerStaffing",
	linkTo: "constraints",
	linkKey: "scheduling.gate.viewConstraints",
	nextNoteKey: "scheduling.gate.noLongerNote",
	department: "Kitchen",
};

describe("setupLinksOf", () => {
	it.each([
		[
			"bothReads",
			holding("shift:read", "constraint:read"),
			SHIFTS_LINK,
			CONSTRAINTS_LINK,
		],
		["shiftsReadOnly", holding("shift:read"), SHIFTS_LINK, undefined],
		[
			"constraintsReadOnly",
			holding("constraint:read"),
			undefined,
			CONSTRAINTS_LINK,
		],
		["noReads", holding(), undefined, undefined],
	])(
		"given_%s_when_linked_then_onlyTheTabsThatMayBeRead",
		(_, can, shifts, constraints) => {
			const links = setupLinksOf(KITCHEN, can);

			expect(links.editShifts).toEqual(shifts);
			expect(links.editConstraints).toEqual(constraints);
		}
	);

	it.each([
		["bothCreates", holding("shift:create", "constraint:create"), true, true],
		["shiftCreateOnly", holding("shift:create"), true, false],
		["constraintCreateOnly", holding("constraint:create"), false, true],
		["readsOnly", holding("shift:read", "constraint:read"), false, false],
	])(
		"given_%s_when_linked_then_canFixFollowsTheCreateKeys",
		(_, can, shifts, constraints) => {
			expect(setupLinksOf(KITCHEN, can).canFix).toEqual({
				shifts,
				constraints,
			});
		}
	);

	it("given_noDepartment_when_linked_then_nothingToLinkOrFixEvenWithEveryKey", () => {
		const links = setupLinksOf(undefined, () => true);

		expect(links.editShifts).toBeUndefined();
		expect(links.editConstraints).toBeUndefined();
		expect(links.canFix).toEqual({ shifts: false, constraints: false });
		expect(
			links.fixLink(NOTHING_GATE, { next: "create", month: "2026-12" })
		).toBeUndefined();
	});

	it("given_aShiftsGateAndANewMonth_when_fixed_then_theShiftsTabCarryingTheMonthBack", () => {
		const links = setupLinksOf(KITCHEN, holding("shift:read"));

		expect(
			links.fixLink(NOTHING_GATE, { next: "create", month: "2026-12" })
		).toEqual({
			to: "/scheduling",
			search: {
				view: "shifts",
				branch: "b-1",
				department: "d-1",
				next: "create",
				month: "2026-12",
			},
		});
	});

	it("given_aConstraintsGateAndASavedDraft_when_fixed_then_theConstraintsTabCarryingTheDraftBack", () => {
		const links = setupLinksOf(KITCHEN, holding("constraint:read"));

		expect(
			links.fixLink(NO_STAFFING_GATE, { next: "draft", scheduleId: "s-1" })
		).toEqual({
			to: "/scheduling",
			search: {
				view: "constraints",
				branch: "b-1",
				department: "d-1",
				next: "draft",
				scheduleId: "s-1",
			},
		});
	});

	it("given_aGateWhoseTabMayNotBeRead_when_fixed_then_noLink", () => {
		const links = setupLinksOf(KITCHEN, holding("constraint:read"));

		expect(
			links.fixLink(NOTHING_GATE, { next: "create", month: "2026-12" })
		).toBeUndefined();
	});

	it("given_aGateWithoutALink_when_fixed_then_noLink", () => {
		const links = setupLinksOf(KITCHEN, () => true);
		const gateWithoutLink: Gate = { ...NOTHING_GATE, linkTo: undefined };

		expect(
			links.fixLink(gateWithoutLink, { next: "create", month: "2026-12" })
		).toBeUndefined();
	});
});
