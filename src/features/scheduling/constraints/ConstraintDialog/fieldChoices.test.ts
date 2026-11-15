import { describe, expect, it } from "vitest";
import type {
	ConstraintField,
	ConstraintFieldSpec,
	ConstraintType,
} from "@/features/scheduling/constraints/api";
import {
	allowedLinkIds,
	linksByKindOf,
	valuesListingNone,
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

	it("offers the job titles any of two chosen shifts lists", () => {
		expect(
			allowedLinkIds(
				specIn(STAFFING, "JOB_TITLE"),
				STAFFING,
				{ SHIFT: ["front-desk-am", "lunch-rush"] },
				links
			)
		).toEqual([
			"cashier",
			"front-desk-lead",
			"front-desk-staff",
			"service-staff",
			"supervisor",
		]);
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

describe("withoutUnfitting", () => {
	it("takes out a job title once no chosen shift lists it, and says why", () => {
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
