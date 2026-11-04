import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { weekdaySchema } from "@/common/weekdays";
import type {
	AvailabilityDay,
	DatedWindow,
	ReplaceAvailabilityRequest,
	WeekAvailability,
	WeeklyAvailability,
} from "@/features/availability/availabilityModel";
import { companyPath } from "@/features/organisation/api";
import {
	departmentPath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import {
	accessiblePreviousData,
	administrativeMeta,
	selfMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The work availability routes (ADR-0053 of the API): a member's weekly
 * pattern and one week's override of it, read under `work_availability:read`
 * and changed under `work_availability:update`; the caller's own, read and
 * changed with nothing granted; the company's part-timers for one week, one
 * Branch at a time; and a
 * Department's part-timers who have none.
 */

const daysSchema: z.ZodType<Array<AvailabilityDay>> = z.array(
	z.object({
		day: weekdaySchema,
		windows: z.array(z.object({ startTime: z.string(), endTime: z.string() })),
	})
);

const weeklyAvailabilitySchema: z.ZodType<WeeklyAvailability> = z.object({
	membershipId: z.string(),
	days: daysSchema,
	/** Mondays, this week on, that have an override; none from an API without overrides. */
	overrideWeeks: z.array(z.string()).default([]),
});

const weekAvailabilitySchema: z.ZodType<WeekAvailability> = z.object({
	membershipId: z.string(),
	weekStartMonday: z.string(),
	days: daysSchema,
});

const memberWithoutAvailabilitySchema = z.object({
	membershipId: z.string(),
	/** The id a refused generation would name them by. */
	memberProfileId: z.string(),
	displayName: z.string(),
});

/** A part-time member of a Department who has no availability, so is left off its rosters. */
export type MemberWithoutAvailability = z.infer<
	typeof memberWithoutAvailabilitySchema
>;

const readinessSchema = z.object({
	partTimeMembersWithoutAvailability: z.array(memberWithoutAvailabilitySchema),
});

const datedWindowSchema: z.ZodType<DatedWindow> = z.object({
	date: z.iso.date(),
	startTime: z.string(),
	endTime: z.string(),
});

const memberWeekSchema = z.object({
	membershipId: z.string(),
	memberProfileId: z.string(),
	displayName: z.string(),
	/** Null for a member filed at no Department. */
	departmentId: z.string().nullable(),
	departmentName: z.string().nullable(),
	/** Whether the week follows their pattern or has an override of its own. */
	source: z.enum(["PATTERN", "OVERRIDE"]),
	/** The windows in force that week, on the dates they start. */
	windows: z.array(datedWindowSchema),
});

/** One part-time member's week, as a Branch's availability lists it. */
export type MemberWeek = z.infer<typeof memberWeekSchema>;

const availabilityListSchema = z.object({
	weekStartMonday: z.string(),
	members: z.array(memberWeekSchema),
});

/** Part-timers and the windows each has in one week, as the company's list answers them. */
export type AvailabilityList = z.infer<typeof availabilityListSchema>;

/** Whose availability: a colleague's, by membership, or the caller's own. */
export type AvailabilityOwner =
	{ kind: "member"; membershipId: string } | { kind: "me" };

export const MY_AVAILABILITY: AvailabilityOwner = { kind: "me" };

export const memberOwner = (membershipId: string): AvailabilityOwner => ({
	kind: "member",
	membershipId,
});

const availabilityPathOf = (
	companyId: string,
	owner: AvailabilityOwner
): string =>
	owner.kind === "me"
		? `${companyPath(companyId)}/me/availability`
		: `${companyPath(companyId)}/member-profiles/${encodeURIComponent(owner.membershipId)}/availability`;

const weekPath = (
	companyId: string,
	owner: AvailabilityOwner,
	weekStartMonday: string
): string =>
	`${availabilityPathOf(companyId, owner)}/weeks/${encodeURIComponent(weekStartMonday)}`;

/** A week without an override is answered 404: read as none, so the pattern applies. */
const noneWhenMissing = async <T>(read: Promise<T>): Promise<T | null> => {
	try {
		return await read;
	} catch (error) {
		if (error instanceof ApiProblemError && error.status === 404) return null;
		throw error;
	}
};

/** A weekly pattern; a colleague's is refused with 403 outside the units where it may be read. */
export const fetchAvailability = (
	companyId: string,
	owner: AvailabilityOwner,
	signal?: AbortSignal
): Promise<WeeklyAvailability> =>
	apiRequest(availabilityPathOf(companyId, owner), weeklyAvailabilitySchema, {
		signal,
	});

/** Makes a pattern exactly `request`'s windows and returns it as saved. */
export const replaceAvailability = (
	companyId: string,
	owner: AvailabilityOwner,
	request: ReplaceAvailabilityRequest
): Promise<WeeklyAvailability> =>
	apiRequest(availabilityPathOf(companyId, owner), weeklyAvailabilitySchema, {
		method: "PUT",
		body: request,
	});

/** One week's override of a pattern; null when the week has none. */
export const fetchWeekAvailability = (
	companyId: string,
	owner: AvailabilityOwner,
	weekStartMonday: string,
	signal?: AbortSignal
): Promise<WeekAvailability | null> =>
	noneWhenMissing(
		apiRequest(
			weekPath(companyId, owner, weekStartMonday),
			weekAvailabilitySchema,
			{ signal }
		)
	);

/** Gives one week its own windows in place of the pattern; an empty set means not available that week. */
export const replaceWeekAvailability = (
	companyId: string,
	owner: AvailabilityOwner,
	weekStartMonday: string,
	request: ReplaceAvailabilityRequest
): Promise<WeekAvailability> =>
	apiRequest(
		weekPath(companyId, owner, weekStartMonday),
		weekAvailabilitySchema,
		{ method: "PUT", body: request }
	);

/** Returns one week to the pattern; a week that had no override is already there. */
export const deleteWeekAvailability = async (
	companyId: string,
	owner: AvailabilityOwner,
	weekStartMonday: string
): Promise<void> => {
	await noneWhenMissing(
		apiRequestVoid(weekPath(companyId, owner, weekStartMonday), {
			method: "DELETE",
		})
	);
};

/**
 * Which part-timers, and which week: those of one Branch, or of one
 * Department of it. The list is the company's, read through the caller's
 * grants, so a Department-only grant under the Branch lists that
 * Department's members.
 */
export type AvailabilityListQuery = {
	/** "YYYY-MM-DD", a Monday. */
	weekStartMonday: string;
	/** Narrows the members to one Branch; left out lists every Branch in reach. */
	branchId?: string;
	/** Narrows the members to one Department. */
	departmentId?: string;
};

export const availabilityListPath = (
	companyId: string,
	{ weekStartMonday, branchId, departmentId }: AvailabilityListQuery
): string => {
	const query = new URLSearchParams({ weekStartMonday });
	if (branchId) query.set("branchId", branchId);
	if (departmentId) query.set("departmentId", departmentId);
	return `${companyPath(companyId)}/availability?${query.toString()}`;
};

/** Part-timers and their windows for one week; the API lists only those in reach. */
export const fetchAvailabilityList = (
	companyId: string,
	query: AvailabilityListQuery,
	signal?: AbortSignal
): Promise<AvailabilityList> =>
	apiRequest(availabilityListPath(companyId, query), availabilityListSchema, {
		signal,
	});

/**
 * The Department's part-timers without any availability, by name; none when
 * all have some. Given `weekStartMonday`, as that week's overrides leave them.
 */
export const fetchPartTimeMembersWithoutAvailability = async (
	companyId: string,
	unit: DepartmentPath,
	weekStartMonday: string | undefined,
	signal?: AbortSignal
): Promise<Array<MemberWithoutAvailability>> => {
	const week = weekStartMonday
		? `?${new URLSearchParams({ weekStartMonday }).toString()}`
		: "";
	const readiness = await apiRequest(
		`${departmentPath(companyId, unit)}/availability-readiness${week}`,
		readinessSchema,
		{ signal }
	);
	return readiness.partTimeMembersWithoutAvailability;
};

/** Every availability entry of the company, so a change to anyone's reloads them all; as leave roots its own. */
export const availabilityRoot = (
	companyId: string
): readonly ["availability", string] => ["availability", companyId] as const;

const patternKeyOf = (
	companyId: string,
	owner: AvailabilityOwner
): ReadonlyArray<string> =>
	owner.kind === "me"
		? [...availabilityRoot(companyId), "me"]
		: [...availabilityRoot(companyId), "member", owner.membershipId];

/**
 * A member's weekly pattern. `allowed` false asks for nothing: someone not
 * part-time, or a person the workspace does not let read it.
 */
export const memberAvailabilityQuery = (
	companyId: string,
	membershipId: string,
	allowed = true
): UndefinedInitialDataOptions<
	WeeklyAvailability,
	Error,
	WeeklyAvailability,
	ReadonlyArray<string>
> =>
	queryOptions({
		queryKey: patternKeyOf(companyId, memberOwner(membershipId)),
		queryFn: allowed
			? ({ signal }): Promise<WeeklyAvailability> =>
					fetchAvailability(companyId, memberOwner(membershipId), signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The caller's own pattern; `allowed` false, for someone not part-time, asks for nothing. */
export const myAvailabilityQuery = (
	companyId: string,
	allowed = true
): UndefinedInitialDataOptions<
	WeeklyAvailability,
	Error,
	WeeklyAvailability,
	ReadonlyArray<string>
> =>
	queryOptions({
		queryKey: patternKeyOf(companyId, MY_AVAILABILITY),
		queryFn: allowed
			? ({ signal }): Promise<WeeklyAvailability> =>
					fetchAvailability(companyId, MY_AVAILABILITY, signal)
			: skipToken,
		// Own record: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/**
 * One week's override, null for a week without one; inside the pattern's
 * entries, so reloading the pattern reloads its weeks. Without
 * `weekStartMonday` nothing is asked.
 */
export const weekAvailabilityQuery = (
	companyId: string,
	owner: AvailabilityOwner,
	weekStartMonday: string | undefined
): UndefinedInitialDataOptions<
	WeekAvailability | null,
	Error,
	WeekAvailability | null,
	ReadonlyArray<string>
> =>
	queryOptions({
		queryKey: [
			...patternKeyOf(companyId, owner),
			"weeks",
			weekStartMonday ?? "",
		] as ReadonlyArray<string>,
		queryFn: weekStartMonday
			? ({ signal }): Promise<WeekAvailability | null> =>
					fetchWeekAvailability(companyId, owner, weekStartMonday, signal)
			: skipToken,
		meta:
			owner.kind === "me" ? selfMeta(companyId) : administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/**
 * The company's part-timers for one week, inside one Branch and the
 * person's grants; each week, Branch and Department is its own entry. `allowed` false asks for nothing, for a person the
 * workspace does not let read it.
 */
export const availabilityListQuery = (
	companyId: string,
	query: AvailabilityListQuery,
	allowed = true
): UndefinedInitialDataOptions<
	AvailabilityList,
	Error,
	AvailabilityList,
	readonly ["availability", string, "list", AvailabilityListQuery]
> =>
	queryOptions({
		queryKey: [...availabilityRoot(companyId), "list", query] as const,
		queryFn: allowed
			? ({ signal }): Promise<AvailabilityList> =>
					fetchAvailabilityList(companyId, query, signal)
			: skipToken,
		// Keep the current rows on screen while another week or Department loads, unless withdrawn.
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/**
 * A Department's part-timers who have no availability, for the week
 * starting `weekStartMonday` when given. Without `unit`, a Department not
 * chosen or one where it may not be read, nothing is asked.
 */
export const partTimeReadinessQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	weekStartMonday?: string
): UndefinedInitialDataOptions<
	Array<MemberWithoutAvailability>,
	Error,
	Array<MemberWithoutAvailability>,
	readonly ["availability", string, "readiness", string, string, string]
> =>
	queryOptions({
		queryKey: [
			...availabilityRoot(companyId),
			"readiness",
			unit?.branchId ?? "",
			unit?.departmentId ?? "",
			weekStartMonday ?? "",
		] as const,
		queryFn: unit
			? ({ signal }): Promise<Array<MemberWithoutAvailability>> =>
					fetchPartTimeMembersWithoutAvailability(
						companyId,
						unit,
						weekStartMonday,
						signal
					)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
