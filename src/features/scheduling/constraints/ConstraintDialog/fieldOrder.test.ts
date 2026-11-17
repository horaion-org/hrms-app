import { describe, expect, it } from "vitest";
import type { ConstraintFieldSpec } from "@/features/scheduling/constraints/api";
import {
	fieldRowsInReadingOrder,
	fieldsInReadingOrder,
	isFieldShown,
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
		[
			"DAYS_OFF_PER_PERIOD",
			["COMPARISON", "DAYS_OFF", "PERIOD_WEEKS", "DAY_TYPE"],
		],
		["AVOID_DAYS_OFF_ON", ["WEEKDAY"]],
		["REST_BETWEEN_SHIFTS", ["REST_HOURS"]],
		[
			"BANNED_SHIFT_PATTERN",
			[
				"PATTERN_DAY_1",
				"PATTERN_DAY_2",
				"PATTERN_DAY_3",
				"PATTERN_DAY_4",
				"PATTERN_DAY_5",
				"PATTERN_DAY_6",
				"PATTERN_DAY_7",
			],
		],
		["MAX_WORK_HOURS_PER_DAY", ["WORK_HOURS_A_DAY"]],
		["MAX_OVERTIME_HOURS_PER_MONTH", ["OVERTIME_HOURS_A_MONTH"]],
		["MAX_CALL_BACKS_PER_PERSON", ["CALL_BACKS", "CALL_BACK_SPAN_DAYS"]],
		[
			"PAY_RATES",
			["OVERTIME_PERCENT", "REST_DAY_WORK_PERCENT", "DAY_OFF_WORK_PERCENT"],
		],
		["OVERTIME_STRETCH", ["STRETCH_HOURS"]],
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
		[
			"DAYS_OFF_PER_PERIOD",
			[["COMPARISON", "DAYS_OFF"], ["PERIOD_WEEKS"], ["DAY_TYPE"]],
		],
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

describe("isFieldShown", () => {
	it("shows a banned pattern's first two days, and each later day once the day before has a shift", () => {
		const nightThenMorning = {
			PATTERN_DAY_1: ["night"],
			PATTERN_DAY_2: ["morning"],
		};

		expect(isFieldShown("PATTERN_DAY_1", {})).toBe(true);
		expect(isFieldShown("PATTERN_DAY_2", {})).toBe(true);
		expect(isFieldShown("PATTERN_DAY_3", {})).toBe(false);
		expect(isFieldShown("PATTERN_DAY_3", nightThenMorning)).toBe(true);
		expect(isFieldShown("PATTERN_DAY_4", nightThenMorning)).toBe(false);
		expect(isFieldShown("PATTERN_DAY_3", { PATTERN_DAY_2: [""] })).toBe(false);
	});

	it("keeps a day with shifts shown after the day before is cleared, so it can be cleared too", () => {
		expect(
			isFieldShown("PATTERN_DAY_3", {
				PATTERN_DAY_2: [],
				PATTERN_DAY_3: ["night"],
			})
		).toBe(true);
	});

	it("always shows every other field", () => {
		expect(isFieldShown("SHIFT", {})).toBe(true);
		expect(isFieldShown("REST_HOURS", {})).toBe(true);
	});
});
