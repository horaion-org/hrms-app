/** The primary language subtag of a BCP 47 tag, lower-cased: `en` for `en-GB`. */
const primaryLanguageOf = (tag: string): string =>
	tag.split("-")[0]?.toLowerCase() ?? "";

/**
 * The locale dates, times and numbers are written in: the first of the
 * browser's languages that is a regional form of the app's language, else
 * the app's language itself. English in a British browser is written as
 * `en-GB` (day first, 24-hour clock), not the bare `en` the translations
 * resolve to, which formats as in the US.
 */
export const formattingLocaleOf = (
	language: string,
	browserLanguages: ReadonlyArray<string>
): string =>
	browserLanguages.find(
		(tag) => primaryLanguageOf(tag) === primaryLanguageOf(language)
	) ?? language;

/** The app's current language as i18next holds it. */
type AppLanguage = { resolvedLanguage?: string; language?: string };

/** {@link formattingLocaleOf} for the app's current language and this browser's languages. */
export const formattingLocale = (
	i18n: AppLanguage,
	browserLanguages: ReadonlyArray<string> = typeof navigator === "undefined"
		? []
		: navigator.languages
): string =>
	formattingLocaleOf(
		i18n.resolvedLanguage ?? i18n.language ?? "en",
		browserLanguages
	);
