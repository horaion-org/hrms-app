import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { schedulePath, type DepartmentPath } from "@/features/scheduling/paths";
import { scheduleKey } from "@/features/scheduling/schedules/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * A schedule's starting context (T3-12, the API's ADR-0056): what each member
 * was doing in the 7 days before the period. Days a roster (the published
 * one, else the newest generated) or approved leave covers come filled and
 * locked; the rest may be entered on a draft as a shift or a day off, and an
 * empty day is not known, never read as worked or off. The context is frozen
 * when generation is requested and drives rest between shifts and days off.
 */

// A kind or source a newer API adds reads as UNKNOWN instead of failing the whole answer.
const knownDayKindSchema = z
	.enum(["WORKED", "OFF", "LEAVE", "UNKNOWN"])
	.catch("UNKNOWN");
const startingDaySourceSchema = z
	.enum(["PUBLISHED", "GENERATED", "LEAVE", "ENTERED", "UNKNOWN"])
	.catch("UNKNOWN");
const memberContextSourceSchema = z
	.enum(["PUBLISHED", "GENERATED", "ENTERED", "NONE", "UNKNOWN"])
	.catch("UNKNOWN");

const startingCellSchema = z.object({
	date: z.string(),
	/** Null when the day is not known. */
	kind: knownDayKindSchema.nullable(),
	source: startingDaySourceSchema.nullable(),
	/** A roster or approved leave covers it, so it can't be entered. */
	locked: z.boolean(),
	/** An entered worked day's live shift. */
	shiftId: z.string().nullable(),
	shiftName: z.string().nullable(),
	startTime: z.string().nullable(),
	endTime: z.string().nullable(),
});

/** One member's day before the period. */
export type StartingCell = z.infer<typeof startingCellSchema>;

const startingDaysSchema = z.object({
	/** The 7 days before the period, in order. */
	days: z.array(z.string()),
	/** The roster that counts for the day before the period; null when there is none. */
	previousRoster: z
		.object({
			scheduleId: z.string(),
			name: z.string(),
			status: z.string(),
			periodStart: z.string(),
		})
		.nullable(),
	/** The department's live shifts a worked day may name. */
	shifts: z.array(
		z.object({
			shiftId: z.string(),
			name: z.string(),
			startTime: z.string(),
			endTime: z.string(),
		})
	),
	members: z.array(
		z.object({
			memberProfileId: z.string(),
			displayName: z.string(),
			jobTitleName: z.string().nullable(),
			cells: z.array(startingCellSchema),
		})
	),
});

/** The week before a schedule's period, as the Generate step's grid shows it. */
export type StartingDays = z.infer<typeof startingDaysSchema>;

/** One entered day, as the save sends it. */
export type EnteredDay = {
	memberProfileId: string;
	date: string;
	kind: "SHIFT" | "OFF";
	shiftId: string | null;
};

const startingContextSchema = z.object({
	/** True for the rows frozen at the generation request. */
	frozen: z.boolean(),
	/** Members whose days before the period changed since the freeze. */
	staleMemberProfileIds: z.array(z.string()),
	members: z.array(
		z.object({
			memberProfileId: z.string().nullable(),
			displayName: z.string(),
			consecutiveWorkingDays: z.number(),
			trailingSevenDays: z.string(),
			source: memberContextSourceSchema,
		})
	),
});

/** Where each member stood as the schedule's period began. */
export type StartingContext = z.infer<typeof startingContextSchema>;

const startingDaysPath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string => `${schedulePath(companyId, unit, scheduleId)}/starting-days`;

/** The week before a schedule's period. */
export const fetchStartingDays = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<StartingDays> =>
	apiRequest(
		startingDaysPath(companyId, unit, scheduleId),
		startingDaysSchema,
		{
			signal,
		}
	);

/** Replaces the days entered on a draft; answers the grid as it now stands. */
export const saveStartingDays = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	days: Array<EnteredDay>
): Promise<StartingDays> =>
	apiRequest(
		startingDaysPath(companyId, unit, scheduleId),
		startingDaysSchema,
		{
			method: "PUT",
			body: { days },
		}
	);

/** Where each member stood as the period began, frozen or derived now. */
export const fetchStartingContext = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<StartingContext> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/starting-context`,
		startingContextSchema,
		{ signal }
	);

/** The key a schedule's week before is cached under, below the schedule's own. */
export const startingDaysKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "starting-days"] =>
	[...scheduleKey(companyId, scheduleId), "starting-days"] as const;

/** The key a schedule's starting context is cached under, below the schedule's own. */
export const startingContextKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "starting-context"] =>
	[...scheduleKey(companyId, scheduleId), "starting-context"] as const;

/** A schedule's week before; `unit` undefined, or `allowed` false, asks for nothing. */
export const startingDaysQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	StartingDays,
	Error,
	StartingDays,
	ReturnType<typeof startingDaysKey>
> =>
	queryOptions({
		queryKey: startingDaysKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<StartingDays> =>
						fetchStartingDays(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** A schedule's starting context; `unit` undefined, or `allowed` false, asks for nothing. */
export const startingContextQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	StartingContext,
	Error,
	StartingContext,
	ReturnType<typeof startingContextKey>
> =>
	queryOptions({
		queryKey: startingContextKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<StartingContext> =>
						fetchStartingContext(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
