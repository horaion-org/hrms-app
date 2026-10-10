import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	SHIFT_COLOUR_PATTERN,
	WEEKDAYS,
} from "@/features/scheduling/shifts/api";

/** The most job titles one shift may apply to. */
export const MAX_ROLES = 20;

const TIME_PATTERN = /^\d{2}:\d{2}$/;

type ShiftSchema = z.ZodObject<{
	name: z.ZodString;
	group: z.ZodString;
	colour: z.ZodString;
	startTime: z.ZodString;
	endTime: z.ZodString;
	days: z.ZodArray<z.ZodEnum<{ [K in (typeof WEEKDAYS)[number]]: K }>>;
	jobTitleIds: z.ZodArray<z.ZodString>;
}>;

/** Mirrors the API's rules for a shift; name uniqueness remains a server decision. */
export const shiftSchema = (t: TFunction): ShiftSchema => {
	const key = "scheduling.shifts.dialog";
	return z.object({
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		group: z
			.string()
			.trim()
			.min(1, t(`${key}.groupRequired`)),
		colour: z.string().regex(SHIFT_COLOUR_PATTERN, t(`${key}.colourRequired`)),
		startTime: z.string().regex(TIME_PATTERN, t(`${key}.timeRequired`)),
		endTime: z.string().regex(TIME_PATTERN, t(`${key}.timeRequired`)),
		days: z.array(z.enum(WEEKDAYS)).min(1, t(`${key}.daysRequired`)),
		jobTitleIds: z
			.array(z.string())
			.min(1, t(`${key}.rolesRequired`))
			.max(MAX_ROLES, t(`${key}.rolesMax`, { max: MAX_ROLES })),
	});
};

/** What the form holds while being filled in. */
export type ShiftFormValues = z.input<ShiftSchema>;

/** What a valid form yields: the API's body. */
export type ShiftValues = z.output<ShiftSchema>;
