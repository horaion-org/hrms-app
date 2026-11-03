import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { weekdaySchema } from "@/common/weekdays";
import { companyPath } from "@/features/organisation/api";
import type {
	AvailabilityDay,
	ReplaceAvailabilityRequest,
	WeekAvailability,
	WeeklyAvailability,
} from "@/features/people/availability/availabilityModel";
import {
	departmentPath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import { administrativeMeta, selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The work availability routes (ADR-0053 of the API): a member's weekly
 * pattern, read under `work_availability:read` and replaced as one set under
 * `member_profile:update`; one week's override of it, read, replaced and
 * removed the same way; the caller's own, read only; and a Department's
 * part-timers who have none.
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

const memberAvailabilityPath = (
	companyId: string,
	membershipId: string
): string =>
	`${companyPath(companyId)}/member-profiles/${encodeURIComponent(membershipId)}/availability`;

const myAvailabilityPath = (companyId: string): string =>
	`${companyPath(companyId)}/me/availability`;

const weekPath = (availabilityPath: string, weekStartMonday: string): string =>
	`${availabilityPath}/weeks/${encodeURIComponent(weekStartMonday)}`;

/** A week without an override is answered 404: read as none, so the pattern applies. */
const noneWhenMissing = async <T>(read: Promise<T>): Promise<T | null> => {
	try {
		return await read;
	} catch (error) {
		if (error instanceof ApiProblemError && error.status === 404) return null;
		throw error;
	}
};

/** A member's weekly pattern; 403 outside the units where it may be read. */
export const fetchMemberAvailability = (
	companyId: string,
	membershipId: string,
	signal?: AbortSignal
): Promise<WeeklyAvailability> =>
	apiRequest(
		memberAvailabilityPath(companyId, membershipId),
		weeklyAvailabilitySchema,
		{ signal }
	);

/** Makes a member's pattern exactly `request`'s windows and returns it as saved. */
export const replaceMemberAvailability = (
	companyId: string,
	membershipId: string,
	request: ReplaceAvailabilityRequest
): Promise<WeeklyAvailability> =>
	apiRequest(
		memberAvailabilityPath(companyId, membershipId),
		weeklyAvailabilitySchema,
		{ method: "PUT", body: request }
	);

/** One week's override of a member's pattern; null when the week has none. */
export const fetchMemberWeekAvailability = (
	companyId: string,
	membershipId: string,
	weekStartMonday: string,
	signal?: AbortSignal
): Promise<WeekAvailability | null> =>
	noneWhenMissing(
		apiRequest(
			weekPath(
				memberAvailabilityPath(companyId, membershipId),
				weekStartMonday
			),
			weekAvailabilitySchema,
			{ signal }
		)
	);

/** Gives one week its own windows in place of the pattern; an empty set means not available that week. */
export const replaceMemberWeekAvailability = (
	companyId: string,
	membershipId: string,
	weekStartMonday: string,
	request: ReplaceAvailabilityRequest
): Promise<WeekAvailability> =>
	apiRequest(
		weekPath(memberAvailabilityPath(companyId, membershipId), weekStartMonday),
		weekAvailabilitySchema,
		{ method: "PUT", body: request }
	);

/** Returns one week to the pattern; a week that had no override is already there. */
export const deleteMemberWeekAvailability = async (
	companyId: string,
	membershipId: string,
	weekStartMonday: string
): Promise<void> => {
	await noneWhenMissing(
		apiRequestVoid(
			weekPath(
				memberAvailabilityPath(companyId, membershipId),
				weekStartMonday
			),
			{ method: "DELETE" }
		)
	);
};

/** The caller's own pattern; the API resolves the member from the caller. */
export const fetchMyAvailability = (
	companyId: string,
	signal?: AbortSignal
): Promise<WeeklyAvailability> =>
	apiRequest(myAvailabilityPath(companyId), weeklyAvailabilitySchema, {
		signal,
	});

/** One week's override of the caller's own pattern; null when the week has none. */
export const fetchMyWeekAvailability = (
	companyId: string,
	weekStartMonday: string,
	signal?: AbortSignal
): Promise<WeekAvailability | null> =>
	noneWhenMissing(
		apiRequest(
			weekPath(myAvailabilityPath(companyId), weekStartMonday),
			weekAvailabilitySchema,
			{ signal }
		)
	);

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

/** Every Department's readiness, so a change to anyone's availability reloads them. */
export const readinessRoot = (
	companyId: string
): readonly ["people", string, "availability-readiness"] =>
	["people", companyId, "availability-readiness"] as const;

/** Whose availability: a colleague's, by membership, or the caller's own. */
export type AvailabilityOwner =
	{ kind: "member"; membershipId: string } | { kind: "me" };

/**
 * A member's weekly pattern; inside their profile's entries, so a saved
 * profile reloads it. `allowed` false asks for nothing: someone not
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
	readonly ["people", string, "profile", string, "availability"]
> =>
	queryOptions({
		queryKey: [
			"people",
			companyId,
			"profile",
			membershipId,
			"availability",
		] as const,
		queryFn: allowed
			? ({ signal }): Promise<WeeklyAvailability> =>
					fetchMemberAvailability(companyId, membershipId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		// The route loader's fetch serves the first render instead of being repeated on mount.
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
	readonly ["people", string, "me", "availability"]
> =>
	queryOptions({
		queryKey: ["people", companyId, "me", "availability"] as const,
		queryFn: allowed
			? ({ signal }): Promise<WeeklyAvailability> =>
					fetchMyAvailability(companyId, signal)
			: skipToken,
		// Own record: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The pattern's key, which each of its weeks' keys starts with. */
const patternKeyOf = (
	companyId: string,
	owner: AvailabilityOwner
): ReadonlyArray<string> =>
	owner.kind === "me"
		? myAvailabilityQuery(companyId).queryKey
		: memberAvailabilityQuery(companyId, owner.membershipId).queryKey;

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
> => {
	const queryKey: ReadonlyArray<string> = [
		...patternKeyOf(companyId, owner),
		"weeks",
		weekStartMonday ?? "",
	];
	return queryOptions({
		queryKey,
		queryFn: weekStartMonday
			? ({ signal }): Promise<WeekAvailability | null> =>
					owner.kind === "me"
						? fetchMyWeekAvailability(companyId, weekStartMonday, signal)
						: fetchMemberWeekAvailability(
								companyId,
								owner.membershipId,
								weekStartMonday,
								signal
							)
			: skipToken,
		meta:
			owner.kind === "me" ? selfMeta(companyId) : administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
};

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
	readonly ["people", string, "availability-readiness", string, string, string]
> =>
	queryOptions({
		queryKey: [
			...readinessRoot(companyId),
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
		retry,
	});
