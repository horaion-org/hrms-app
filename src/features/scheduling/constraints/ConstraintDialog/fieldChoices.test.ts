import { describe, expect, it } from "vitest";
import type {
	ConstraintField,
	ConstraintFieldSpec,
	ConstraintType,
} from "@/features/scheduling/constraints/api";
import {
	allowedComparisons,
	allowedLinkIds,
	dayTypeCodesOf,
	linksByKindOf,
	sharesNothing,
	shownValuesOf,
	valuesListingNone,
	withoutUnfitComparison,
	withoutUnfitting,
} from "@/features/scheduling/constraints/ConstraintDialog/fieldChoices";
import { CONSTRAINT_OPTIONS } from "@/features/scheduling/constraints/fixtures";

/*
 * Front Desk AM lists Front Desk Staff and Lead; Lunch Rush lists Service
 * Staff, Cashier, Kitchen Runner and Supervisor; Closing Crew lists Closing
 * Lead, Service Staff and Supervisor (`shifts/fixtures.ts`).
 */
const links = linksByKindOf(CONSTRAINT_OPTIONS);
/** A type's fields as the fixtures declare them. */
const specsOf = (type: ConstraintType): Array<ConstraintFieldSpec> =>
	CONSTRAINT_OPTIONS.types.find((option) => option.type === type)!.fields;
const STAFFING = specsOf("SHIFT_STAFFING");
const WITH_STAND_INS = specsOf("SHIFT_STAFFING_WITH_STAND_INS");
const REST = specsOf("REST_BETWEEN_SHIFTS");
/** One field's declaration among a type's. */
const specIn = (
	specs: Array<ConstraintFieldSpec>,
	field: ConstraintField
): ConstraintFieldSpec => specs.find((spec) => spec.field === field)!;

describe("allowedLinkIds", () => {
	it("offers only the job titles one chosen shift lists", () => {
		expect(
			allowedLinkIds(
				specIn(STAFFING, "JOB_TITLE"),
				STAFFING,
				{ SHIFT: ["front-desk-am"] },
				links
			)
		).toEqual(["front-desk-lead", "front-desk-staff"]);
	});

	it("offers only the job titles both of two chosen shifts list", () => {
		expect(
			allowedLinkIds(
				specIn(STAFFING, "JOB_TITLE"),
				STAFFING,
				{ SHIFT: ["lunch-rush", "closing-crew"] },
				links
			)
		).toEqual(["service-staff", "supervisor"]);
	});

	it("offers nothing when two chosen shifts share no job title", () => {
		expect(
			allowedLinkIds(
				specIn(STAFFING, "JOB_TITLE"),
				STAFFING,
				{ SHIFT: ["front-desk-am", "lunch-rush"] },
				links
			)
		).toEqual([]);
	});

	it("never asks a chosen shift that is no longer offered", () => {
		expect(
			allowedLinkIds(
				specIn(STAFFING, "JOB_TITLE"),
				STAFFING,
				{ SHIFT: ["front-desk-am", "a-deleted-shift"] },
				links
			)
		).toEqual(["front-desk-lead", "front-desk-staff"]);
	});

	it("offers no job title before a shift is chosen", () => {
		expect(
			allowedLinkIds(specIn(STAFFING, "JOB_TITLE"), STAFFING, {}, links)
		).toEqual([]);
	});

	it("never offers a counted job title as a stand-in", () => {
		expect(
			allowedLinkIds(
				specIn(WITH_STAND_INS, "STAND_IN_JOB_TITLE"),
				WITH_STAND_INS,
				{ SHIFT: ["front-desk-am"], JOB_TITLE: ["front-desk-staff"] },
				links
			)
		).toEqual(["front-desk-lead"]);
	});

	it("offers every shift, which depends on nothing", () => {
		expect(
			allowedLinkIds(specIn(STAFFING, "SHIFT"), STAFFING, {}, links)
		).toEqual(CONSTRAINT_OPTIONS.shifts.map((shift) => shift.shiftId));
	});
});

describe("sharesNothing", () => {
	it("says two chosen shifts share no job title", () => {
		expect(
			sharesNothing(
				specIn(STAFFING, "JOB_TITLE"),
				STAFFING,
				{ SHIFT: ["front-desk-am", "lunch-rush"] },
				links
			)
		).toBe(true);
	});

	it("is not said when two chosen shifts share one", () => {
		expect(
			sharesNothing(
				specIn(STAFFING, "JOB_TITLE"),
				STAFFING,
				{ SHIFT: ["lunch-rush", "closing-crew"] },
				links
			)
		).toBe(false);
	});

	it("is never said with one shift, or none, chosen", () => {
		const jobTitles = specIn(STAFFING, "JOB_TITLE");
		expect(
			sharesNothing(
				jobTitles,
				STAFFING,
				{ SHIFT: ["concierge-support"] },
				links
			)
		).toBe(false);
		expect(sharesNothing(jobTitles, STAFFING, {}, links)).toBe(false);
	});

	it("is not said for stand-ins left out only because they are counted", () => {
		expect(
			sharesNothing(
				specIn(WITH_STAND_INS, "STAND_IN_JOB_TITLE"),
				WITH_STAND_INS,
				{
					SHIFT: ["lunch-rush", "closing-crew"],
					JOB_TITLE: ["service-staff", "supervisor"],
				},
				links
			)
		).toBe(false);
	});

	it("is never said for a field that depends on nothing", () => {
		expect(
			sharesNothing(
				specIn(STAFFING, "SHIFT"),
				STAFFING,
				{ SHIFT: ["front-desk-am", "lunch-rush"] },
				links
			)
		).toBe(false);
	});
});

describe("withoutUnfitting", () => {
	it("takes out the job titles outside the overlap when a second shift is chosen", () => {
		expect(
			withoutUnfitting(
				STAFFING,
				{
					SHIFT: ["lunch-rush", "closing-crew"],
					JOB_TITLE: ["cashier", "supervisor"],
				},
				links
			)
		).toEqual({
			values: {
				SHIFT: ["lunch-rush", "closing-crew"],
				JOB_TITLE: ["supervisor"],
			},
			removed: [{ field: "JOB_TITLE", value: "cashier", reason: "NOT_LISTED" }],
		});
	});

	it("takes out a job title once the chosen shift does not list it, and says why", () => {
		expect(
			withoutUnfitting(
				STAFFING,
				{
					SHIFT: ["lunch-rush"],
					JOB_TITLE: ["front-desk-lead", "service-staff"],
				},
				links
			)
		).toEqual({
			values: { SHIFT: ["lunch-rush"], JOB_TITLE: ["service-staff"] },
			removed: [
				{ field: "JOB_TITLE", value: "front-desk-lead", reason: "NOT_LISTED" },
			],
		});
	});

	it("takes out a stand-in that is now counted", () => {
		expect(
			withoutUnfitting(
				WITH_STAND_INS,
				{
					SHIFT: ["front-desk-am"],
					JOB_TITLE: ["front-desk-lead"],
					STAND_IN_JOB_TITLE: ["front-desk-lead", "front-desk-staff"],
				},
				links
			).removed
		).toEqual([
			{
				field: "STAND_IN_JOB_TITLE",
				value: "front-desk-lead",
				reason: "EXCLUDED",
			},
		]);
	});

	it("takes out nothing for a type with no declarations", () => {
		const values = { REST_HOURS: ["11"] };
		expect(withoutUnfitting(REST, values, links)).toEqual({
			values,
			removed: [],
		});
	});
});

describe("valuesListingNone", () => {
	it("names a chosen shift that lists none of the chosen job titles or stand-ins", () => {
		expect(
			valuesListingNone(
				WITH_STAND_INS,
				{
					SHIFT: ["front-desk-am", "lunch-rush"],
					JOB_TITLE: ["front-desk-lead"],
					STAND_IN_JOB_TITLE: ["front-desk-staff"],
				},
				links
			)
		).toEqual({ SHIFT: ["lunch-rush"] });
	});

	it("names nothing while no job title is chosen, or when every shift lists one", () => {
		expect(
			valuesListingNone(STAFFING, { SHIFT: ["lunch-rush"] }, links)
		).toEqual({});
		expect(
			valuesListingNone(
				STAFFING,
				{
					SHIFT: ["lunch-rush", "closing-crew"],
					JOB_TITLE: ["service-staff"],
				},
				links
			)
		).toEqual({});
	});
});

const DAYS_OFF = specsOf("DAYS_OFF_PER_PERIOD");
const WEEKLY = specsOf("DAY_TYPE_DAYS_PER_WEEK");
const MAX_DAYS = specsOf("MAX_DAYS_WITHOUT_DAY_TYPES");
const EVERY_COMPARISON = ["AT_LEAST", "AT_MOST", "EXACTLY"] as const;
/**
 * The days-off fields as a type that narrows its comparisons for a partial
 * set would declare them; no type does since ADR-0104, but the API may.
 */
const PARTIAL_AT_LEAST = DAYS_OFF.map((spec) =>
	spec.field === "DAY_TYPE"
		? { ...spec, partialComparisons: ["AT_LEAST" as const] }
		: spec
);

describe("day types (ADR-0087)", () => {
	it("offers a field's own day types, or every code when it names none", () => {
		expect(
			dayTypeCodesOf(specIn(DAYS_OFF, "DAY_TYPE"), ["OFF", "REST", "LEAVE"])
		).toEqual(["OFF", "REST"]);
		expect(
			dayTypeCodesOf(specIn(MAX_DAYS, "DAY_TYPE"), ["OFF", "REST", "LEAVE"])
		).toEqual(["OFF", "REST", "LEAVE"]);
	});

	it("shows every day type as chosen when an optional field holds none, and what is chosen otherwise", () => {
		expect(shownValuesOf(specIn(DAYS_OFF, "DAY_TYPE"), [])).toEqual([
			"OFF",
			"REST",
		]);
		expect(shownValuesOf(specIn(DAYS_OFF, "DAY_TYPE"), ["REST"])).toEqual([
			"REST",
		]);
		expect(shownValuesOf(specIn(WEEKLY, "DAY_TYPE"), [])).toEqual([]);
	});

	it("offers every comparison on a days-off rule counting Day off alone (ADR-0104)", () => {
		expect(
			allowedComparisons(DAYS_OFF, { DAY_TYPE: ["OFF"] }, EVERY_COMPARISON)
		).toEqual([...EVERY_COMPARISON]);
		expect(
			withoutUnfitComparison(
				DAYS_OFF,
				{ COMPARISON: ["EXACTLY"], DAY_TYPE: ["OFF"] },
				EVERY_COMPARISON
			).removed
		).toEqual([]);
	});

	it("offers only a field's partial comparisons while some but not every day type counts", () => {
		expect(
			allowedComparisons(
				PARTIAL_AT_LEAST,
				{ DAY_TYPE: ["REST"] },
				EVERY_COMPARISON
			)
		).toEqual(["AT_LEAST"]);
		expect(allowedComparisons(PARTIAL_AT_LEAST, {}, EVERY_COMPARISON)).toEqual(
			[...EVERY_COMPARISON]
		);
		expect(
			allowedComparisons(
				PARTIAL_AT_LEAST,
				{ DAY_TYPE: ["OFF", "REST"] },
				EVERY_COMPARISON
			)
		).toEqual([...EVERY_COMPARISON]);
	});

	it("takes out a comparison a partial set does not take, and says why", () => {
		expect(
			withoutUnfitComparison(
				PARTIAL_AT_LEAST,
				{ COMPARISON: ["AT_MOST"], DAY_TYPE: ["REST"] },
				EVERY_COMPARISON
			)
		).toEqual({
			values: { COMPARISON: [], DAY_TYPE: ["REST"] },
			removed: [{ field: "COMPARISON", value: "AT_MOST", reason: "PARTIAL" }],
		});
		expect(
			withoutUnfitComparison(
				PARTIAL_AT_LEAST,
				{ COMPARISON: ["AT_LEAST"], DAY_TYPE: ["REST"] },
				EVERY_COMPARISON
			).removed
		).toEqual([]);
	});
});
