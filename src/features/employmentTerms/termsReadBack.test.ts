import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import {
	FIVE_DAY_WEEK,
	REFERENCE,
	SIX_DAY_SHIFT,
} from "@/features/employmentTerms/fixtures";
import { termsSentence } from "@/features/employmentTerms/summary";
import {
	termsFormValuesOf,
	weekFieldsOf,
} from "@/features/employmentTerms/termsForm";
import { readBackOf } from "@/features/employmentTerms/termsReadBack";

const t = i18n.getFixedT("en");
const valid = termsFormValuesOf(FIVE_DAY_WEEK);

describe("readBackOf", () => {
	it("reads complete terms back as the one sentence every screen uses", () => {
		expect(readBackOf(valid, REFERENCE, t, "en")).toEqual({
			complete: true,
			text: termsSentence(weekFieldsOf(valid)!, REFERENCE, t),
		});
	});

	it("names what is missing instead of a sentence about a week that isn't there", () => {
		expect(readBackOf({ ...valid, weekHours: "" }, REFERENCE, t, "en")).toEqual(
			{
				complete: false,
				text: "Not finished yet: fill in or check the normal hours a week.",
			}
		);
	});

	it("names every unfinished field, in the form's order", () => {
		expect(
			readBackOf(
				{ ...valid, weekHours: "lots", dayHours: "", restWeekday: "" },
				REFERENCE,
				t,
				"en"
			).text
		).toBe(
			"Not finished yet: fill in or check the normal hours a week, the normal hours a day, and the rest day’s weekday."
		);
	});

	it("calls the day the longest shift for shift work", () => {
		expect(
			readBackOf(
				{ ...termsFormValuesOf(SIX_DAY_SHIFT), dayHours: "8:75" },
				REFERENCE,
				t,
				"en"
			).text
		).toBe("Not finished yet: fill in or check the longest shift.");
	});

	it("refuses a week its days can't hold rather than reading it back", () => {
		expect(
			readBackOf({ ...valid, weekHours: "60" }, REFERENCE, t, "en").complete
		).toBe(false);
	});

	it("is never stopped by the name or the description", () => {
		expect(
			readBackOf({ ...valid, name: "" }, REFERENCE, t, "en").complete
		).toBe(true);
	});

	it("names a day longer than the country's longest normal day", () => {
		expect(
			readBackOf({ ...valid, dayHours: "13" }, REFERENCE, t, "en").text
		).toBe("Not finished yet: fill in or check the normal hours a day.");
	});
});
