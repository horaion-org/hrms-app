import type { DepartmentPath } from "@/common/companyPath";
import type { SchedulingReadiness } from "@/features/scheduling/readiness/api";

/*
 * What the gate and the checklist say about one department's readiness, and
 * where their links go. The API decides readiness; this only chooses the
 * words for its answer.
 */

/** Which setup tab a gate's link opens. */
export type SetupView = "shifts" | "constraints";

/** A wizard step's warning about a department not ready to schedule, and the note under its disabled action. */
export type Gate = {
	messageKey:
		| "scheduling.gate.nothing"
		| "scheduling.gate.noStaffing"
		| "scheduling.gate.cannotFixShifts"
		| "scheduling.gate.cannotFixStaffing"
		| "scheduling.gate.noLongerShift"
		| "scheduling.gate.noLongerStaffing";
	linkTo?: SetupView;
	linkKey?:
		| "scheduling.gate.setUp"
		| "scheduling.gate.addStaffing"
		| "scheduling.gate.viewShifts"
		| "scheduling.gate.viewConstraints";
	nextNoteKey:
		| "scheduling.gate.nothingNote"
		| "scheduling.gate.noStaffingNote"
		| "scheduling.gate.noLongerNote";
	department: string;
};

/** Where a wizard step meets the gate: before the draft exists, or before generating it. */
export type GateStage = "setup" | "generate";

/** Whether the person may add what is missing: shifts, and constraints. */
export type CanFix = { shifts: boolean; constraints: boolean };

/** The link that fixes, or only shows, what is missing: add it when allowed, else view it. */
const fixOf = (
	linkTo: SetupView,
	canFix: CanFix
): Pick<Gate, "linkTo" | "linkKey"> => {
	if (linkTo === "shifts")
		return {
			linkTo,
			linkKey: canFix.shifts
				? "scheduling.gate.setUp"
				: "scheduling.gate.viewShifts",
		};
	return {
		linkTo,
		linkKey: canFix.constraints
			? "scheduling.gate.addStaffing"
			: "scheduling.gate.viewConstraints",
	};
};

/**
 * The gate for one department's readiness, or none when it is ready. Without
 * a shift, nothing is set up; with shifts, the staffing constraint is
 * missing. Someone who can't add the missing part is told who can. At
 * Generate, the saved draft's department is no longer ready.
 */
export const gateOf = (
	row: SchedulingReadiness,
	canFix: CanFix,
	stage: GateStage
): Gate | undefined => {
	if (row.ready) return undefined;
	const department = row.departmentName;
	const noShift = row.missing.includes("SHIFT");
	const linkTo: SetupView = noShift ? "shifts" : "constraints";
	const link = fixOf(linkTo, canFix);
	if (stage === "generate")
		return {
			messageKey: noShift
				? "scheduling.gate.noLongerShift"
				: "scheduling.gate.noLongerStaffing",
			...link,
			nextNoteKey: "scheduling.gate.noLongerNote",
			department,
		};
	const nextNoteKey = noShift
		? "scheduling.gate.nothingNote"
		: "scheduling.gate.noStaffingNote";
	const allowed = noShift ? canFix.shifts : canFix.constraints;
	if (!allowed)
		return {
			messageKey: noShift
				? "scheduling.gate.cannotFixShifts"
				: "scheduling.gate.cannotFixStaffing",
			...link,
			nextNoteKey,
			department,
		};
	return {
		messageKey: noShift
			? "scheduling.gate.nothing"
			: "scheduling.gate.noStaffing",
		...link,
		nextNoteKey,
		department,
	};
};

/** One step of the first-run checklist, done or not. */
export type ChecklistItem = { key: "addShift" | "addStaffing"; done: boolean };

/** The first-run checklist: add a shift, then a staffing constraint, each ticked when no longer missing. */
export const checklistOf = (row: SchedulingReadiness): Array<ChecklistItem> => [
	{ key: "addShift", done: !row.missing.includes("SHIFT") },
	{ key: "addStaffing", done: !row.missing.includes("STAFFING_CONSTRAINT") },
];

/** Where the wizard comes back to after the fix: a new month's Setup with its month (or a new week's), or a saved draft. */
export type ReturnTo =
	| { next: "create"; week?: string; month?: string }
	| { next: "draft"; scheduleId: string };

/** The search for `/scheduling` that opens a setup tab on the department, carrying the way back. */
export type FixSearch = {
	view: SetupView;
	branch: string;
	department: string;
	next: "create" | "draft";
	week?: string;
	month?: string;
	scheduleId?: string;
};

/** The setup tab that fixes the department, narrowed to it, remembering where to return. */
export const fixLinkOf = (
	view: SetupView,
	unit: DepartmentPath,
	returnTo: ReturnTo
): FixSearch => ({
	view,
	branch: unit.branchId,
	department: unit.departmentId,
	...returnTo,
});

/** The parts of the Scheduling page's search the way back reads. */
export type ReturnSearch = {
	next?: "create" | "draft";
	department?: string;
	week?: string;
	month?: string;
	scheduleId?: string;
};

/** The way back into the wizard. */
export type ReturnLink =
	| {
			to: "/scheduling/new";
			search: { department?: string; week?: string; month?: string };
	  }
	| {
			to: "/scheduling/new";
			search: { step: "generate"; scheduleId: string; departmentId: string };
	  };

/**
 * The way back the tab offers once the department is ready: a new draft's
 * Setup with the department and its week or month, or the saved draft's Generate step.
 * None without `next`, or for a draft without its id or department.
 */
export const returnLinkOf = (search: ReturnSearch): ReturnLink | undefined => {
	if (search.next === "create")
		return {
			to: "/scheduling/new",
			search: {
				...(search.department ? { department: search.department } : {}),
				...(search.week ? { week: search.week } : {}),
				...(search.month ? { month: search.month } : {}),
			},
		};
	if (search.next === "draft" && search.scheduleId && search.department)
		return {
			to: "/scheduling/new",
			search: {
				step: "generate",
				scheduleId: search.scheduleId,
				departmentId: search.department,
			},
		};
	return undefined;
};
