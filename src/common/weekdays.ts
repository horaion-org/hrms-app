import { z } from "zod";

export const weekdaySchema = z.enum([
	"MON",
	"TUE",
	"WED",
	"THU",
	"FRI",
	"SAT",
	"SUN",
]);

/** A day of the week as the API names it. */
export type Weekday = z.infer<typeof weekdaySchema>;

/** Monday first: the week starts on Monday everywhere in Horaion. */
export const WEEKDAYS = weekdaySchema.options;

export const isWeekday = (value: string): value is Weekday =>
	weekdaySchema.safeParse(value).success;
