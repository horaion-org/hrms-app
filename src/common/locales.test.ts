import { describe, expect, it } from "vitest";
import english from "@/assets/locales/en/translations.json";
import spanish from "@/assets/locales/es/translations.json";

type Translations = { [key: string]: string | Translations };

/** Every leaf key as a dotted path, plural suffixes included (`count_one`). */
const keysOf = (translations: Translations, prefix = ""): Array<string> =>
	Object.entries(translations).flatMap(([key, value]) => {
		const path = `${prefix}${key}`;
		return typeof value === "string" ? [path] : keysOf(value, `${path}.`);
	});

const missingFrom = (
	translations: Translations,
	reference: Translations
): Array<string> => {
	const present = new Set(keysOf(translations));
	return keysOf(reference).filter((key) => !present.has(key));
};

describe("locales", () => {
	// i18next falls back to English silently, so a missing key never fails anywhere else.
	it("gives Spanish every English key", () => {
		expect(missingFrom(spanish, english)).toEqual([]);
	});

	it("has no Spanish key that English lacks", () => {
		expect(missingFrom(english, spanish)).toEqual([]);
	});
});
