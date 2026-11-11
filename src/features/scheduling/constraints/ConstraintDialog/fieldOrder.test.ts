import { describe, expect, it } from "vitest";
import type { ConstraintFieldSpec } from "@/features/scheduling/constraints/api";
import {
	fieldRowsInReadingOrder,
	fieldsInReadingOrder,
} from "@/features/scheduling/constraints/ConstraintDialog/fieldOrder";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";

const fieldsOf = (specs: Array<ConstraintFieldSpec>): Array<string> =>
	specs.map((spec) => spec.field);

describe("fieldsInReadingOrder", () => {
	it.each([
		["SHIFT_STAFFING", ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"]],
		[
			"SHIFT_STAFFING_WITH_STAND_INS",
			[
				"SHIFT",
				"HEADCOUNT",
				"JOB_TITLE",
				"STAND_INS_PER_PERSON",
				"STAND_IN_JOB_TITLE",
			],
		],
		["ROLE_PRESENCE", ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"]],
		["DAYS_OFF_PER_PERIOD", ["COMPARISON", "DAYS_OFF", "PERIOD_DAYS"]],
		["AVOID_DAYS_OFF_ON", ["WEEKDAY"]],
		["REST_BETWEEN_SHIFTS", ["REST_HOURS"]],
	])("orders %s's fields as its sentence reads them", (type, order) => {
		const option = CONSTRAINT_TYPE_OPTIONS.find((each) => each.type === type)!;

		expect(fieldsOf(fieldsInReadingOrder(option))).toEqual(order);
	});

	it("keeps a field the order does not know after the known ones, in the API's place", () => {
		const rest = CONSTRAINT_TYPE_OPTIONS.find(
			(each) => each.type === "REST_BETWEEN_SHIFTS"
		)!;
		const unknown = { ...rest.fields[0]!, field: "WEEKDAY" as const };

		expect(
			fieldsOf(
				fieldsInReadingOrder({ ...rest, fields: [unknown, ...rest.fields] })
			)
		).toEqual(["REST_HOURS", "WEEKDAY"]);
	});
});

describe("fieldRowsInReadingOrder", () => {
	it.each([
		["SHIFT_STAFFING", [["SHIFT"], ["COMPARISON", "HEADCOUNT"], ["JOB_TITLE"]]],
		["DAYS_OFF_PER_PERIOD", [["COMPARISON", "DAYS_OFF"], ["PERIOD_DAYS"]]],
		[
			"SHIFT_STAFFING_WITH_STAND_INS",
			[
				["SHIFT"],
				["HEADCOUNT"],
				["JOB_TITLE"],
				["STAND_INS_PER_PERSON"],
				["STAND_IN_JOB_TITLE"],
			],
		],
	])("puts %s's comparison and its number on one row", (type, rows) => {
		const option = CONSTRAINT_TYPE_OPTIONS.find((each) => each.type === type)!;

		expect(fieldRowsInReadingOrder(option).map(fieldsOf)).toEqual(rows);
	});
});
