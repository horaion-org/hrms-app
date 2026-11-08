import i18n, { type InitOptions } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import translationEN from "@/assets/locales/en/translations.json";
import translationES from "@/assets/locales/es/translations.json";
import { isProduction } from "@/common/utils";

export const defaultNS = "translations";
export const resources = {
	en: { translations: translationEN },
	es: { translations: translationES },
} as const;

const i18nOptions: InitOptions = {
	// Translations ship inside the bundle, so nothing is fetched at runtime.
	resources,
	defaultNS,
	ns: [defaultNS],
	supportedLngs: Object.keys(resources),
	// A regional browser language such as `en-US` resolves to `en`.
	load: "languageOnly",
	debug: !isProduction,
	fallbackLng: "en",
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
};

// Keeps `<html lang>` on the language the app shows (`en` or `es`), so screen readers and
// hyphenation follow it. Registered before init, so the first language is applied too.
i18n.on("languageChanged", () => {
	document.documentElement.lang = i18n.resolvedLanguage ?? "en";
});

void i18n.use(initReactI18next).use(LanguageDetector).init(i18nOptions);
