import i18n from "i18next";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import { TERMS_PRESETS } from "@/features/employmentTerms/fixtures";
import {
	holdsPreset,
	presetLine,
	valuesOfPreset,
} from "@/features/employmentTerms/startFrom";
import { termsFormValuesOf } from "@/features/employmentTerms/termsForm";

const t = i18n.getFixedT("en");
const [fiveDays, , sixDays, partTime, managers] = TERMS_PRESETS.presets;

describe("startFrom", () => {
	it("given_aPreset_when_clicked_then_itsAnswersKeepingTheTypedName", () => {
		const current = { ...termsFormValuesOf(undefined), name: "Front desk" };
		const values = valuesOfPreset(managers!, current);
		expect(values).toMatchObject({
			name: "Front desk",
			hoursLimitsApply: false,
			extraHoursPaidAs: "NOTHING",
		});
		expect(holdsPreset(values, managers!)).toBe(true);
	});

	it("given_aFigureChanged_when_compared_then_noLongerHoldsThePreset", () => {
		const values = valuesOfPreset(fiveDays!, termsFormValuesOf(undefined));
		expect(holdsPreset({ ...values, weekHours: "40" }, fiveDays!)).toBe(false);
	});

	it.each([
		[fiveDays!, "44 h, rest day Sunday"],
		[sixDays!, "44 h, rest day changes"],
		[partTime!, "20 h, days vary"],
		[managers!, "Not under the Act’s hour rules"],
	])("given_%o_when_lined_then_%s", (preset, line) => {
		expect(presetLine(preset, t)).toBe(line);
	});
});
