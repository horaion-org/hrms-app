import { describe, expect, it } from "vitest";
import { readinessFixture } from "@/features/scheduling/readiness/fixtures";
import {
	checklistOf,
	fixLinkOf,
	gateOf,
	returnLinkOf,
} from "@/features/scheduling/readiness/readinessCopy";

const NOTHING = readinessFixture({
	ready: false,
	missing: ["SHIFT", "STAFFING_CONSTRAINT"],
});
const NO_STAFFING = readinessFixture({
	ready: false,
	missing: ["STAFFING_CONSTRAINT"],
});
const BOTH = { shifts: true, constraints: true };
const NEITHER = { shifts: false, constraints: false };
const KITCHEN = { branchId: "b-1", departmentId: "d-1" };

describe("gateOf", () => {
	it("gives no gate for a ready department, at either stage", () => {
		expect(gateOf(readinessFixture(), BOTH, "setup")).toBeUndefined();
		expect(gateOf(readinessFixture(), BOTH, "generate")).toBeUndefined();
	});

	it("asks to set up a department with nothing set up, linking to its shifts", () => {
		expect(gateOf(NOTHING, BOTH, "setup")).toEqual({
			messageKey: "scheduling.gate.nothing",
			linkTo: "shifts",
			linkKey: "scheduling.gate.setUp",
			nextNoteKey: "scheduling.gate.nothingNote",
			department: "Kitchen",
		});
	});

	it("asks for a staffing constraint when there are shifts, linking to its constraints", () => {
		expect(gateOf(NO_STAFFING, BOTH, "setup")).toEqual({
			messageKey: "scheduling.gate.noStaffing",
			linkTo: "constraints",
			linkKey: "scheduling.gate.addStaffing",
			nextNoteKey: "scheduling.gate.noStaffingNote",
			department: "Kitchen",
		});
	});

	it("tells someone who can't add the shifts who can, offering only to view them", () => {
		expect(
			gateOf(NOTHING, { shifts: false, constraints: true }, "setup")
		).toEqual({
			messageKey: "scheduling.gate.cannotFixShifts",
			linkTo: "shifts",
			linkKey: "scheduling.gate.viewShifts",
			nextNoteKey: "scheduling.gate.nothingNote",
			department: "Kitchen",
		});
	});

	it("tells someone who can't add the staffing constraint who can, offering only to view them", () => {
		expect(
			gateOf(NO_STAFFING, { shifts: true, constraints: false }, "setup")
		).toEqual({
			messageKey: "scheduling.gate.cannotFixStaffing",
			linkTo: "constraints",
			linkKey: "scheduling.gate.viewConstraints",
			nextNoteKey: "scheduling.gate.noStaffingNote",
			department: "Kitchen",
		});
	});

	it("says at Generate that the department no longer has a shift, or a staffing constraint", () => {
		expect(gateOf(NOTHING, BOTH, "generate")).toEqual({
			messageKey: "scheduling.gate.noLongerShift",
			linkTo: "shifts",
			linkKey: "scheduling.gate.setUp",
			nextNoteKey: "scheduling.gate.noLongerNote",
			department: "Kitchen",
		});
		expect(gateOf(NO_STAFFING, NEITHER, "generate")).toEqual({
			messageKey: "scheduling.gate.noLongerStaffing",
			linkTo: "constraints",
			linkKey: "scheduling.gate.viewConstraints",
			nextNoteKey: "scheduling.gate.noLongerNote",
			department: "Kitchen",
		});
	});
});

describe("checklistOf", () => {
	it("ticks each step once it is no longer missing", () => {
		expect(checklistOf(NOTHING)).toEqual([
			{ key: "addShift", done: false },
			{ key: "addStaffing", done: false },
		]);
		expect(checklistOf(NO_STAFFING)).toEqual([
			{ key: "addShift", done: true },
			{ key: "addStaffing", done: false },
		]);
	});
});

describe("fixLinkOf", () => {
	it("opens the tab on the department, carrying a new draft's week", () => {
		expect(
			fixLinkOf("shifts", KITCHEN, { next: "create", week: "2026-11-16" })
		).toEqual({
			view: "shifts",
			branch: "b-1",
			department: "d-1",
			next: "create",
			week: "2026-11-16",
		});
	});

	it("opens the tab on the department, carrying a saved draft's id", () => {
		expect(
			fixLinkOf("constraints", KITCHEN, { next: "draft", scheduleId: "s-1" })
		).toEqual({
			view: "constraints",
			branch: "b-1",
			department: "d-1",
			next: "draft",
			scheduleId: "s-1",
		});
	});
});

describe("returnLinkOf", () => {
	it("returns a new draft to Setup with the department and the week", () => {
		expect(
			returnLinkOf({ next: "create", department: "d-1", week: "2026-11-16" })
		).toEqual({
			to: "/scheduling/new",
			search: { department: "d-1", week: "2026-11-16" },
		});
	});

	it("returns a new month to Setup with the department and the month", () => {
		expect(
			returnLinkOf({ next: "create", department: "d-1", month: "2026-12" })
		).toEqual({
			to: "/scheduling/new",
			search: { department: "d-1", month: "2026-12" },
		});
	});

	it("returns a saved draft to its Generate step", () => {
		expect(
			returnLinkOf({ next: "draft", department: "d-1", scheduleId: "s-1" })
		).toEqual({
			to: "/scheduling/new",
			search: { step: "generate", scheduleId: "s-1", departmentId: "d-1" },
		});
	});

	it("offers no way back without next, or for a draft without its department", () => {
		expect(returnLinkOf({ department: "d-1" })).toBeUndefined();
		expect(returnLinkOf({ next: "draft", scheduleId: "s-1" })).toBeUndefined();
	});
});
