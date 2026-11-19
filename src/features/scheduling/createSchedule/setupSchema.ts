import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import { NAME_LIMITS } from "@/features/organisation/nameSchema";
import { formatDay } from "@/common/formatDay";
import {
	dayCountOf,
	datesProblemOf,
	MAX_DAYS_BY_DATES,
	maxLastDayOf,
} from "@/features/scheduling/dates/datesSetup";

type ScheduleSetupSchema = z.ZodObject<{
	departmentId: z.ZodString;
	name: z.ZodString;
	periodStart: z.ZodString;
	includeLeave: z.ZodBoolean;
}>;

/** Mirrors the API's rules for a schedule's setup; a Monday start remains a server decision. */
export const scheduleSetupSchema = (t: TFunction): ScheduleSetupSchema =>
	z.object({
		departmentId: z
			.string()
			.min(1, t("scheduling.setup.validation.department")),
		name: unitNameSchema({
			required: t("scheduling.setup.validation.name"),
			length: t("scheduling.setup.validation.nameLength", NAME_LIMITS),
			characters: t("scheduling.setup.validation.nameCharacters"),
		}),
		periodStart: z.string().min(1, t("scheduling.setup.validation.period")),
		includeLeave: z.boolean(),
	});

export type ScheduleSetupValues = z.infer<ScheduleSetupSchema>;

/** Whether Setup schedules any dates, or a month's ticked weeks; offered in this order, Dates first. */
export const SCHEDULE_FOR = ["dates", "month"] as const;

export type ScheduleFor = (typeof SCHEDULE_FOR)[number];

/** What Setup opens on: the link's choice, else Month when the link names a month (the month page's links), else Dates. */
export const openingScheduleFor = (link: {
	for?: ScheduleFor;
	month?: string;
}): ScheduleFor => link.for ?? (link.month ? "month" : "dates");

/** Create schedule's title, intro and setup line for each choice: Dates speaks of days, Month of a month's weeks. */
const CREATE_SCHEDULE_WORDING = {
	dates: {
		title: "scheduling.dates.create.title",
		subtitle: "scheduling.dates.create.subtitle",
		setupDescription: "scheduling.dates.setup.description",
	},
	month: {
		title: "scheduling.months.create.title",
		subtitle: "scheduling.months.create.subtitle",
		setupDescription: "scheduling.months.setup.description",
	},
} as const;

/** The translation keys of Create schedule's wording while `scheduleFor` is chosen. */
export const createScheduleWordingOf = (
	scheduleFor: ScheduleFor
): (typeof CREATE_SCHEDULE_WORDING)[ScheduleFor] =>
	CREATE_SCHEDULE_WORDING[scheduleFor];

type MonthSetupSchema = z.ZodObject<{
	departmentId: z.ZodString;
	scheduleFor: z.ZodEnum<{ month: "month"; dates: "dates" }>;
	month: z.ZodString;
	firstDay: z.ZodString;
	lastDay: z.ZodString;
	name: z.ZodString;
	includeLeave: z.ZodBoolean;
}>;

/** The branch's today and the person's language, which the dates' messages name days in. */
export type DatesContext = { today: string; language: string };

/**
 * A month run's or a dates run's setup. A month has no name: the API names
 * each week it creates. Dates are checked as the API checks them (it stays
 * the authority), each problem on the field to change, and an optional name
 * by the schedule name rules.
 */
export const monthSetupSchema = (
	t: TFunction,
	dates: DatesContext = { today: "", language: "en" }
): MonthSetupSchema =>
	z
		.object({
			departmentId: z
				.string()
				.min(1, t("scheduling.setup.validation.department")),
			scheduleFor: z.enum(SCHEDULE_FOR),
			month: z.string().min(1, t("scheduling.months.setup.validation.month")),
			/** ISO dates, used when scheduling dates; "" until chosen. */
			firstDay: z.string(),
			lastDay: z.string(),
			/** Optional when scheduling dates: the weeks they create take it. */
			name: z.string(),
			includeLeave: z.boolean(),
		})
		.superRefine((values, context) => {
			if (values.scheduleFor !== "dates") return;
			const key = "scheduling.dates.setup";
			const day = (date: string): string => formatDay(date, dates.language);
			const problem = datesProblemOf(
				values.firstDay,
				values.lastDay,
				dates.today
			);
			if (problem === "missing")
				context.addIssue({
					code: "custom",
					path: [values.firstDay === "" ? "firstDay" : "lastDay"],
					message: t(`${key}.missing`),
				});
			if (problem === "past")
				context.addIssue({
					code: "custom",
					path: ["firstDay"],
					message: t(`${key}.past`, { today: day(dates.today) }),
				});
			if (problem === "reversed")
				context.addIssue({
					code: "custom",
					path: ["lastDay"],
					message: t(`${key}.reversed`, { first: day(values.firstDay) }),
				});
			if (problem === "tooLong")
				context.addIssue({
					code: "custom",
					path: ["lastDay"],
					message: t(`${key}.tooLong`, {
						days: dayCountOf(values.firstDay, values.lastDay),
						max: MAX_DAYS_BY_DATES,
						last: day(maxLastDayOf(values.firstDay)),
					}),
				});
			if (values.name === "") return;
			const name = unitNameSchema({
				required: t("scheduling.setup.validation.name"),
				length: t("scheduling.setup.validation.nameLength", NAME_LIMITS),
				characters: t("scheduling.setup.validation.nameCharacters"),
			}).safeParse(values.name);
			if (!name.success)
				context.addIssue({
					code: "custom",
					path: ["name"],
					message: name.error.issues[0]?.message ?? "",
				});
		});

export type MonthSetupValues = z.infer<MonthSetupSchema>;
