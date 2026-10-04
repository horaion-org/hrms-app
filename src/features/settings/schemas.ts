import type { TFunction } from "i18next";
import { z } from "zod";
import {
	COUNTRY_OPTIONS,
	DATE_FORMAT_OPTIONS,
	LANGUAGE_OPTIONS,
	TIME_ZONE_OPTIONS,
} from "@/features/settings/options";

/** Matches the API's limit on a company name. */
export const WORKSPACE_NAME_MAX_LENGTH = 255;

const valuesOf = <T extends string>(
	options: ReadonlyArray<{ value: T }>
): [T, ...Array<T>] =>
	options.map((option) => option.value) as [T, ...Array<T>];

type OptionEnum<T extends ReadonlyArray<{ value: string }>> = z.ZodEnum<{
	[Value in T[number]["value"]]: Value;
}>;

export const generalSettingsSchema = (
	t: TFunction
): z.ZodObject<{
	workspaceName: z.ZodType<string, string>;
	defaultLanguage: OptionEnum<typeof LANGUAGE_OPTIONS>;
	timeZone: OptionEnum<typeof TIME_ZONE_OPTIONS>;
	dateFormat: OptionEnum<typeof DATE_FORMAT_OPTIONS>;
	country: OptionEnum<typeof COUNTRY_OPTIONS>;
}> =>
	z.object({
		workspaceName: z
			.string()
			.trim()
			.min(1, t("settings.general.validation.required"))
			.max(
				WORKSPACE_NAME_MAX_LENGTH,
				t("settings.general.validation.tooLong", {
					max: WORKSPACE_NAME_MAX_LENGTH,
				})
			),
		defaultLanguage: z.enum(valuesOf(LANGUAGE_OPTIONS)),
		timeZone: z.enum(valuesOf(TIME_ZONE_OPTIONS)),
		dateFormat: z.enum(valuesOf(DATE_FORMAT_OPTIONS)),
		country: z.enum(valuesOf(COUNTRY_OPTIONS)),
	});

export type GeneralSettingsValues = z.infer<
	ReturnType<typeof generalSettingsSchema>
>;
