import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { nameSuggestion } from "@/features/scheduling/constraints/ConstraintDialog/nameSuggestion";

let t: TFunction;

beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

describe("nameSuggestion", () => {
	it.each([
		["SHIFT_STAFFING", "Front desk AM", "Front desk AM staffing"],
		["ROLE_PRESENCE", "Closing", "Closing on duty"],
		["SHIFT_STAFFING", undefined, "People on a shift"],
		["REST_BETWEEN_SHIFTS", undefined, "Rest between shifts"],
		["DAYS_OFF_PER_PERIOD", "Ignored", "Days off"],
	] as const)("names %s with shift %s as %s", (type, shift, name) => {
		expect(nameSuggestion(type, shift, t)).toBe(name);
	});

	it("keeps a name within the 100 characters the API takes", () => {
		expect(nameSuggestion("SHIFT_STAFFING", "A".repeat(120), t)).toHaveLength(
			100
		);
	});
});
