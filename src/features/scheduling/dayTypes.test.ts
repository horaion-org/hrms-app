import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	dayTypeInSentence,
	dayTypeLabel,
} from "@/features/scheduling/dayTypes";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

describe("dayTypeLabel", () => {
	it.each([
		["OFF", "Day off"],
		["REST", "Rest day"],
		["LEAVE", "Leave"],
	])(
		"given_aKnownCode_%s_when_labelled_then_isItsTranslation",
		(code, label) => {
			expect(dayTypeLabel(code, t)).toBe(label);
		}
	);

	it("given_aCodeWithoutATranslation_when_labelled_then_isTheCodeMadeReadable", () => {
		expect(dayTypeLabel("PUBLIC_HOLIDAY_OFF", t)).toBe("Public holiday off");
	});

	it.each([
		["REST", 2, "Rest days"],
		["OFF", 2, "Days off"],
		["REST", 1, "Rest day"],
	])(
		"given_%s_andACountOf_%s_when_labelled_then_isItsPlural",
		(code, count, label) => {
			expect(dayTypeLabel(code, t, count)).toBe(label);
		}
	);

	it.each([
		["LEAVE", "Leave"],
		["PUBLIC_HOLIDAY_OFF", "Public holiday off"],
	])(
		"given_%s_withNoPlural_andACountOf2_when_labelled_then_keepsItsSingular",
		(code, label) => {
			expect(dayTypeLabel(code, t, 2)).toBe(label);
		}
	);
});

describe("dayTypeInSentence", () => {
	it.each([
		["REST", "rest day"],
		["PUBLIC_HOLIDAY_OFF", "public holiday off"],
		[null, "day off"],
	])("given_%s_when_putInASentence_then_isLowerCase", (code, words) => {
		expect(dayTypeInSentence(code, t)).toBe(words);
	});
});
