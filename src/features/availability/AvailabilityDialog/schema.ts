import type { TFunction } from "i18next";
import { z } from "zod";
import { weekdaySchema } from "@/common/weekdays";
import {
	formatWindow,
	validateWindows,
	type WindowDraft,
	type WindowProblem,
} from "@/features/availability/availabilityModel";

/** The availability editor's values: one row per window, each on any number of days. */
export type AvailabilityFormValues = { rows: Array<WindowDraft> };

/** A row's problem, in the person's language; an overlap names the window it is with, e.g. "Sunday 22:00–04:00". */
export const windowProblemMessage = (
	{ kind, day, overlapping }: WindowProblem,
	t: TFunction
): string =>
	t(`availability.dialog.problems.${kind}`, {
		day: day ? t(`weekdays.${day}`) : "",
		overlapping: overlapping
			? `${t(`weekdays.${overlapping.day}`)} ${formatWindow(overlapping)}`
			: "",
	});

/**
 * Mirrors the API's rules for a weekly pattern (see `validateWindows`); each
 * problem lands on its row as `rows.<n>`.
 */
export const availabilityFormSchema = (
	t: TFunction
): z.ZodType<AvailabilityFormValues, AvailabilityFormValues> =>
	z
		.object({
			rows: z.array(
				z.object({
					days: z.array(weekdaySchema),
					startTime: z.string(),
					endTime: z.string(),
				})
			),
		})
		.superRefine(({ rows }, context) => {
			for (const problem of validateWindows(rows))
				context.addIssue({
					code: "custom",
					path: ["rows", problem.row],
					message: windowProblemMessage(problem, t),
				});
		});
