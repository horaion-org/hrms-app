import type { TFunction } from "i18next";
import { z } from "zod";

/** Long enough for "Front Office – Week 16" style names with room to spare. */
export const SCHEDULE_NAME_MAX_LENGTH = 100;

type ScheduleSetupSchema = z.ZodObject<{
	departmentId: z.ZodString;
	name: z.ZodString;
	periodStart: z.ZodString;
	includeLeave: z.ZodBoolean;
	allowOpenShifts: z.ZodBoolean;
}>;

export const scheduleSetupSchema = (t: TFunction): ScheduleSetupSchema =>
	z.object({
		departmentId: z
			.string()
			.min(1, t("scheduling.setup.validation.department")),
		name: z
			.string()
			.trim()
			.min(1, t("scheduling.setup.validation.name"))
			.max(
				SCHEDULE_NAME_MAX_LENGTH,
				t("scheduling.setup.validation.nameTooLong", {
					max: SCHEDULE_NAME_MAX_LENGTH,
				})
			),
		periodStart: z.string().min(1, t("scheduling.setup.validation.period")),
		includeLeave: z.boolean(),
		allowOpenShifts: z.boolean(),
	});

export type ScheduleSetupValues = z.infer<ScheduleSetupSchema>;
