import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";

/** Long enough for "Front Office - Week 16" style names with room to spare. */
export const SCHEDULE_NAME_MAX_LENGTH = 100;

type ScheduleSetupSchema = z.ZodObject<{
	departmentId: z.ZodString;
	name: z.ZodString;
	periodStart: z.ZodString;
	includeLeave: z.ZodBoolean;
	allowOpenShifts: z.ZodBoolean;
}>;

/** Mirrors the API's rules for a schedule's setup; a Monday start remains a server decision. */
export const scheduleSetupSchema = (t: TFunction): ScheduleSetupSchema =>
	z.object({
		departmentId: z
			.string()
			.min(1, t("scheduling.setup.validation.department")),
		name: unitNameSchema({
			required: t("scheduling.setup.validation.name"),
			length: t("scheduling.setup.validation.nameLength", {
				max: SCHEDULE_NAME_MAX_LENGTH,
			}),
			characters: t("scheduling.setup.validation.nameCharacters"),
		}),
		periodStart: z.string().min(1, t("scheduling.setup.validation.period")),
		includeLeave: z.boolean(),
		allowOpenShifts: z.boolean(),
	});

export type ScheduleSetupValues = z.infer<ScheduleSetupSchema>;
