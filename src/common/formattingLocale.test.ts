import { describe, expect, it } from "vitest";
import {
	formattingLocale,
	formattingLocaleOf,
} from "@/common/formattingLocale";

describe("formattingLocaleOf", () => {
	it.each([
		["en", ["en-GB", "en"], "en-GB"],
		["en", ["en-US", "en-GB"], "en-US"],
		["en", ["es-ES", "en-SG"], "en-SG"],
		["es", ["en-GB", "es-ES"], "es-ES"],
		["es", ["en-GB"], "es"],
		["en", [], "en"],
	])(
		"writes %s in a browser preferring %j as %s",
		(language, browserLanguages, locale) => {
			expect(formattingLocaleOf(language, browserLanguages)).toBe(locale);
		}
	);

	it("formats English day first on a 24-hour clock in a British browser", () => {
		const instant = new Date("2026-11-09T06:13:00Z");
		const format = (locale: string): string =>
			new Intl.DateTimeFormat(locale, {
				dateStyle: "medium",
				timeStyle: "short",
				timeZone: "UTC",
			}).format(instant);

		expect(format(formattingLocaleOf("en", ["en-GB"]))).toBe(
			"9 Nov 2026, 06:13"
		);
	});
});

describe("formattingLocale", () => {
	it("takes the language i18next resolved, then the one it was given, then English", () => {
		expect(
			formattingLocale({ resolvedLanguage: "es", language: "es-ES" }, ["es-MX"])
		).toBe("es-MX");
		expect(formattingLocale({ language: "en" }, ["en-GB"])).toBe("en-GB");
		expect(formattingLocale({}, [])).toBe("en");
	});
});
