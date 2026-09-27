import i18n, { type InitOptions } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend, { type HttpBackendOptions } from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import translationEN from "@/assets/locales/en/translations.json";
import translationES from "@/assets/locales/es/translations.json";
import { isProduction } from "@/common/utils";

export const defaultNS = "translations";
export const resources = {
	en: { translations: translationEN },
	es: { translations: translationES },
} as const;

const i18nOptions: InitOptions<HttpBackendOptions> = {
	defaultNS,
	ns: [defaultNS],
	debug: !isProduction,
	fallbackLng: "en",
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
	backend: {
		// Rooted at the app's base URL: a relative path resolves against the
		// current route, so a nested route such as /settings/security would
		// fetch /settings/locales/… and render raw translation keys.
		loadPath: isProduction
			? `${import.meta.env.BASE_URL}locales/{{lng}}/translations.json`
			: `${import.meta.env.BASE_URL}src/assets/locales/{{lng}}/translations.json`,
	},
};

void i18n
	.use(initReactI18next)
	.use(LanguageDetector)
	.use(Backend)
	.init<HttpBackendOptions>(i18nOptions);
