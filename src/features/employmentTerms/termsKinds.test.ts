import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	PART_TIME_BELOW_MINUTES,
	REFERENCE,
	SIX_DAY_SHIFT,
	STANDARD_WEEK,
	TERMS_PRESETS,
} from "@/features/employmentTerms/fixtures";
import { termsFormValuesOf } from "@/features/employmentTerms/termsForm";
import {
	kindDescription,
	kindLabel,
	kindOf,
	presetOfKind,
	TERMS_KINDS,
	valuesForKind,
} from "@/features/employmentTerms/termsKinds";

const t = i18n.getFixedT("en");
const PRESETS = TERMS_PRESETS.presets;

/** The kind a stored terms opens on, read through the form as editing does. */
const kindOfTerms = (terms: Parameters<typeof termsFormValuesOf>[0]): string =>
	kindOf(termsFormValuesOf(terms), PRESETS, PART_TIME_BELOW_MINUTES);

describe("kindOf", () => {
	it.each([
		["a five-day week", FIVE_DAY_WEEK, "FIVE_DAYS"],
		["shift work", SIX_DAY_SHIFT, "SHIFT_WORK"],
		["a week below the part-time line", PART_TIME_20, "PART_TIME"],
		// The seeded default: six days, no kind matches, so it reads as the company's own week.
		["the seeded Standard week", STANDARD_WEEK, "CUSTOM"],
		[
			"five and a half days",
			{ ...FIVE_DAY_WEEK, daysPerWeek: 5.5, dayMinutes: 480 },
			"FIVE_AND_HALF_DAYS",
		],
	])("opens %s on its kind", (_, terms, kind) => {
		expect(kindOfTerms(terms)).toBe(kind);
	});

	it("follows the fields: a part-time week typed up to full time is no longer part-time", () => {
		const values = termsFormValuesOf(PART_TIME_20);
		expect(kindOf({ ...values, weekHours: "40" }, PRESETS, 2100)).toBe(
			"CUSTOM"
		);
		expect(
			kindOf({ ...values, weekHours: "40", daysPerWeek: "5" }, PRESETS, 2100)
		).toBe("FIVE_DAYS");
	});

	it("never calls a week part-time without the company's line", () => {
		expect(kindOf(termsFormValuesOf(PART_TIME_20), PRESETS, null)).toBe(
			"CUSTOM"
		);
	});

	it("can't tell the fixed weeks apart without the presets", () => {
		expect(kindOf(termsFormValuesOf(FIVE_DAY_WEEK), [], 2100)).toBe("CUSTOM");
	});
});

describe("valuesForKind", () => {
	it("fills the week from the kind's preset and keeps the name, description and limits", () => {
		const current = {
			...termsFormValuesOf(FIVE_DAY_WEEK),
			name: "Night desk",
			description: "Our night staff",
			hoursLimitsApply: false,
		};
		const preset = presetOfKind("SHIFT_WORK", PRESETS);
		expect(preset).toBeDefined();
		const next = valuesForKind(preset!, current);
		expect(next).toMatchObject({
			name: "Night desk",
			description: "Our night staff",
			hoursLimitsApply: false,
			shiftWork: true,
			dailyOvertime: false,
			daysPerWeek: "6",
			dayHours: "12",
			weekHours: "44",
			restKind: "ROSTERED",
		});
		expect(kindOf(next, PRESETS, 2100)).toBe("SHIFT_WORK");
	});

	it("given_payTyped_when_aKindIsChosen_then_thePayIsKept", () => {
		const current = {
			...termsFormValuesOf(FIVE_DAY_WEEK),
			overtimeTimes: "2",
			dayOffMode: "OWN_RATE" as const,
			dayOffTimes: "1.75",
		};
		const next = valuesForKind(presetOfKind("SHIFT_WORK", PRESETS)!, current);
		expect(next).toMatchObject({
			overtimeTimes: "2",
			restDayTimes: "2",
			dayOffMode: "OWN_RATE",
			dayOffTimes: "1.75",
		});
	});

	it("given_newTerms_when_aKindIsChosen_then_thePresetsPay", () => {
		const next = valuesForKind(
			presetOfKind("FIVE_DAYS", PRESETS)!,
			termsFormValuesOf(undefined)
		);
		expect(next).toMatchObject({
			overtimeTimes: "1.5",
			restDayTimes: "2",
			dayOffMode: "NORMAL",
			extraHoursPaidAs: "RATE",
		});
	});

	it("gives every kind a preset that opens on that same kind", () => {
		for (const kind of TERMS_KINDS) {
			const preset = presetOfKind(kind, PRESETS)!;
			const values = valuesForKind(preset, termsFormValuesOf(undefined));
			expect(kindOf(values, PRESETS, 2100)).toBe(kind);
		}
	});
});

describe("kindLabel and kindDescription", () => {
	it("words each kind from the API's figures", () => {
		expect(
			TERMS_KINDS.map((kind) => kindLabel(kind, presetOfKind(kind, PRESETS), t))
		).toEqual([
			"Fixed hours, 5 days",
			"Fixed hours, 5½ days",
			"Shift work",
			"Part-time",
		]);
		expect(
			TERMS_KINDS.map((kind) =>
				kindDescription(kind, presetOfKind(kind, PRESETS), REFERENCE, t)
			)
		).toEqual([
			"44 h a week; rest day Sunday.",
			"44 h a week; rest day Sunday.",
			"Shifts of up to 12 h; overtime counts by the week.",
			"Under 35 h a week.",
		]);
	});

	it("states no figure the product does not hold", () => {
		expect(
			kindDescription("FIVE_DAYS", undefined, REFERENCE, t)
		).toBeUndefined();
		expect(
			kindDescription(
				"PART_TIME",
				undefined,
				{
					...REFERENCE,
					partTimeBelowMinutes: null,
				},
				t
			)
		).toBeUndefined();
		expect(kindLabel("FIVE_DAYS", undefined, t)).toBe("Fixed hours");
		expect(kindLabel("CUSTOM", undefined, t)).toBe("Your own week");
	});
});
