/*
 * The General settings' choices. Kept to what the product supports today;
 * add a choice here (with its label under `settings.general.*`) once the app
 * can honour it.
 */

/** BCP 47 language tags the app ships translations for. */
export const LANGUAGE_OPTIONS = [
	{ value: "en", labelKey: "settings.general.languages.en" },
] as const;

/** IANA time zones. */
export const TIME_ZONE_OPTIONS = [
	{
		value: "Asia/Singapore",
		labelKey: "settings.general.timeZones.asiaSingapore",
	},
] as const;

/** Day.js format patterns, in the order the design lists them. */
export const DATE_FORMAT_OPTIONS = [
	{
		value: "DD MM YYYY",
		labelKey: "settings.general.dateFormats.dayMonthYear",
	},
	{
		value: "MM DD YYYY",
		labelKey: "settings.general.dateFormats.monthDayYear",
	},
	{
		value: "YYYY MM DD",
		labelKey: "settings.general.dateFormats.yearMonthDay",
	},
] as const;

/** ISO 3166-1 alpha-2 country codes. */
export const COUNTRY_OPTIONS = [
	{ value: "SG", labelKey: "settings.general.countries.sg" },
] as const;

type ValueOf<T extends ReadonlyArray<{ value: string }>> = T[number]["value"];

export type Language = ValueOf<typeof LANGUAGE_OPTIONS>;
export type TimeZone = ValueOf<typeof TIME_ZONE_OPTIONS>;
export type DateFormat = ValueOf<typeof DATE_FORMAT_OPTIONS>;
export type Country = ValueOf<typeof COUNTRY_OPTIONS>;

/** What a workspace starts with until settings can be saved. */
export const DEFAULT_PREFERENCES = {
	defaultLanguage: "en",
	timeZone: "Asia/Singapore",
	dateFormat: "DD MM YYYY",
	country: "SG",
} as const satisfies {
	defaultLanguage: Language;
	timeZone: TimeZone;
	dateFormat: DateFormat;
	country: Country;
};
