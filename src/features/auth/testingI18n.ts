import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/assets/locales/en/translations.json";

/** Bundled English for tests and stories only; production loading stays unchanged. */
export const authTestI18n = createInstance();
void authTestI18n
	.use(initReactI18next)
	.init({ lng: "en", resources: { en: { translation: en } } });
