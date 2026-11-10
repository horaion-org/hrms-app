import { describe, expect, it } from "vitest";
import {
	cellPanelSections,
	type CellPanelFacts,
	type CellPanelSectionId,
} from "./cellPanelSections";

const PLAIN_DAY: CellPanelFacts = {
	hasIssues: false,
	needsDecision: false,
	leaveRequestPending: false,
	offerOpen: false,
	stranded: false,
	hasChoices: true,
	previewing: false,
	offerSent: false,
	movingLeave: false,
};

describe("cellPanelSections", () => {
	it.each<[string, Partial<CellPanelFacts>, Array<CellPanelSectionId>]>([
		["a day with nothing chosen", {}, ["current", "choices"]],
		["a read-only day", { hasChoices: false }, ["current", "readOnly"]],
		[
			"a day to decide",
			{ needsDecision: true },
			["current", "needsDecision", "choices"],
		],
		[
			"a day with a pending leave request",
			{ leaveRequestPending: true },
			["current", "leaveRequested", "choices"],
		],
		[
			"a roster change being previewed",
			{ previewing: true },
			["current", "choices", "changeReview"],
		],
		[
			"a leave move that doesn't edit the roster",
			{ movingLeave: true },
			["current", "choices", "leaveReview"],
		],
		[
			"a leave move that gives a shift back",
			{ movingLeave: true, previewing: true },
			["current", "choices", "changeReview"],
		],
		[
			"a cancelled leave whose roster edit was refused",
			{ stranded: true, movingLeave: true, previewing: true },
			["current", "stranded", "choices", "changeReview"],
		],
		[
			"a day with notes that need a look",
			{ hasIssues: true },
			["issues", "current", "choices"],
		],
		[
			"a day with a cover offer already out",
			{ offerOpen: true },
			["current", "offerOpen", "choices"],
		],
		[
			"a change just sent as a cover offer",
			{ previewing: true, offerSent: true },
			["current", "choices", "offerSent"],
		],
		[
			"a change previewed while an offer is out",
			{ offerOpen: true, previewing: true },
			["current", "offerOpen", "choices", "changeReview"],
		],
	])("on %s shows its parts in order", (_, facts, sections) => {
		expect(cellPanelSections({ ...PLAIN_DAY, ...facts })).toEqual(sections);
	});
});
