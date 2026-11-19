import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	weekStateSchema,
	type NewWeek,
} from "@/features/scheduling/months/api";
import {
	SCHEDULING_QUERY_ROOT,
	scheduleDatesPath,
} from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * Schedules of any dates (API ADR-0114): up to 31 days, saved as the parts of
 * the weeks they touch. The plan says what generating them would do; the
 * API decides it, so the app only shows it.
 */

/** A run of days, both included, as ISO dates. */
const daysSchema = z.object({ from: z.string(), to: z.string() });

/** A run of days, both included. */
export type DayRun = z.infer<typeof daysSchema>;

/** What generating the dates does with one week; a value a newer API adds reads as UNKNOWN. */
const datesWeekActionSchema = z
	.enum(["CREATE_AND_GENERATE", "GENERATE", "KEEP", "UNKNOWN"])
	.catch("UNKNOWN");

/** A part of a week that already has a schedule, cut to the days one list of the week names. */
const partDaysSchema = z.object({
	scheduleId: z.string(),
	coveredFrom: z.string(),
	coveredTo: z.string(),
	state: weekStateSchema,
	/**
	 * For a part whose days the run replaces (`redone`, `rest`): how many of
	 * those days carry a hand change. Null for a part only kept or with no
	 * roster; left out by an older API, which reads as none.
	 */
	handChangedDays: z.number().nullable().optional(),
	/**
	 * Published, or published and then withdrawn, so staff saw its roster.
	 * Left out by an older API, which reads as false.
	 */
	publishedOnce: z.boolean().nullable().optional(),
});

/** A scheduled part's days that one list of a plan week names. */
export type PartDays = z.infer<typeof partDaysSchema>;

const datesPlanWeekSchema = z.object({
	periodStart: z.string(),
	periodEnd: z.string(),
	/** The asked days that fall in this week. */
	askedFrom: z.string(),
	askedTo: z.string(),
	/** The asked days generated with the run's choices, or null when every asked day is published. */
	newFrom: z.string().nullable(),
	newTo: z.string().nullable(),
	action: datesWeekActionSchema,
	/** The draft covering exactly the new days, which the run generates (GENERATE); otherwise null. */
	draftId: z.string().nullable(),
	/** The week's scheduled parts, each cut to its days that stay as they are (API ADR-0129). */
	kept: z.array(partDaysSchema),
	/** The parts whose days among the new days are scheduled again with the run's choices; absent from an older API. */
	redone: z.array(partDaysSchema).default([]),
	/** The parts whose days after the new days, to the Sunday, are scheduled again with their own shifts and rules. */
	rest: z.array(partDaysSchema).default([]),
});

/** One week the dates touch, and what generating them does with it. */
export type DatesPlanWeek = z.infer<typeof datesPlanWeekSchema>;

/** A person the Department can roster on the first day, whom the manager may choose for the schedule. */
const planPersonSchema = z.object({
	memberProfileId: z.string(),
	displayName: z.string(),
	jobTitleName: z.string().nullable(),
});

/** A person the plan lists. */
export type PlanPerson = z.infer<typeof planPersonSchema>;

export const datesPlanSchema = z.object({
	firstDay: z.string(),
	lastDay: z.string(),
	departmentId: z.string(),
	/** The branch's IANA time zone, whose today the first day is checked against. */
	timeZone: z.string(),
	/** How many days the run generates with its choices. */
	newDays: z.number(),
	weeks: z.array(datesPlanWeekSchema),
	/** The first new day's earlier days of its week that no schedule covers, or null. */
	notRosteredBefore: daysSchema.nullable(),
	/** Why generating would be refused, or null; the weeks are listed either way. */
	refusal: z
		.object({
			/**
			 * SCHEDULE_DAYS_ALL_TAKEN (every asked day published), SCHEDULE_DAYS_BEFORE_ROSTER (days to redo
			 * before published days), SCHEDULE_WEEK_TAKEN (a schedule with no roster in the way) or
			 * SCHEDULE_DAYS_BEING_GENERATED (days to redo being generated).
			 */
			code: z.string(),
			days: daysSchema,
			scheduledDays: daysSchema.nullable(),
		})
		.nullable(),
	/** Everyone the Department can roster on the first day, by name; an older API sends none and the People row hides. */
	people: z.array(planPersonSchema).default([]),
});

/** What generating a Department's dates would do, week by week. */
export type DatesPlan = z.infer<typeof datesPlanSchema>;

/** Why the plan refuses the dates. */
export type DatesRefusal = NonNullable<DatesPlan["refusal"]>;

export const datesGenerationSchema = z.object({
	firstDay: z.string(),
	lastDay: z.string(),
	departmentId: z.string(),
	weeks: z.array(
		z.object({
			periodStart: z.string(),
			scheduleId: z.string().nullable(),
			// An outcome a newer API adds reads as UNKNOWN instead of failing the answer.
			outcome: z
				.enum(["STARTED", "LEFT_AS_IS", "REFUSED", "UNKNOWN"])
				.catch("UNKNOWN"),
			/** KEPT for a week left as it is; the refusal's code when refused. */
			reason: z.string().nullable(),
		})
	),
});

/** What generating the dates did with each week, Monday order. */
export type DatesGeneration = z.infer<typeof datesGenerationSchema>;

/** What generating dates sends: the days, an optional name, and a choice for each week it creates. */
export type GenerateDatesBody = {
	firstDay: string;
	lastDay: string;
	/** Absent: each created week is named as the month run names its weeks. */
	name?: string;
	includeLeave: boolean;
	newWeeks: Array<NewWeek>;
	/** The chosen people's member profile ids; absent rosters everyone. */
	memberProfileIds?: Array<string>;
};

/** The dates' query: the Department is a query parameter, never in the path. */
const datesSearch = (
	departmentId: string,
	days?: { firstDay: string; lastDay: string }
): string => new URLSearchParams({ departmentId, ...days }).toString();

/** What generating the dates would do; a Department out of reach is a 404. */
export const fetchDatesPlan = (
	companyId: string,
	departmentId: string,
	days: { firstDay: string; lastDay: string },
	signal?: AbortSignal
): Promise<DatesPlan> =>
	apiRequest(
		`${scheduleDatesPath(companyId)}/plan?${datesSearch(departmentId, days)}`,
		datesPlanSchema,
		{ signal }
	);

/** Creates the parts the dates need, then starts each; answers each week's outcome. */
export const generateDates = (
	companyId: string,
	departmentId: string,
	body: GenerateDatesBody
): Promise<DatesGeneration> =>
	apiRequest(
		`${scheduleDatesPath(companyId)}/generation?${datesSearch(departmentId)}`,
		datesGenerationSchema,
		{ method: "POST", body }
	);

/** The key a Department's dates plan is cached under, under the scheduling reads a write reloads. */
export const datesPlanKey = (
	companyId: string,
	departmentId: string,
	firstDay: string,
	lastDay: string
): readonly ["scheduling", string, "dates", string, string, string] =>
	[
		SCHEDULING_QUERY_ROOT,
		companyId,
		"dates",
		departmentId,
		firstDay,
		lastDay,
	] as const;

/** A Department's dates plan; `allowed` false asks for nothing. */
export const datesPlanQuery = (
	companyId: string,
	departmentId: string,
	firstDay: string,
	lastDay: string,
	allowed = true
): QueryOptionsFor<DatesPlan, ReturnType<typeof datesPlanKey>> =>
	queryOptions({
		queryKey: datesPlanKey(companyId, departmentId, firstDay, lastDay),
		queryFn: allowed
			? ({ signal }): Promise<DatesPlan> =>
					fetchDatesPlan(companyId, departmentId, { firstDay, lastDay }, signal)
			: skipToken,
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		retry,
	});
