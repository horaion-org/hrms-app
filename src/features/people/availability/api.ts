import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { weekdaySchema } from "@/common/weekdays";
import { companyPath } from "@/features/organisation/api";
import type {
	ReplaceAvailabilityRequest,
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
 * `member_profile:update`; the caller's own, read only; and a Department's
 * part-timers who have none.
 */

const weeklyAvailabilitySchema: z.ZodType<WeeklyAvailability> = z.object({
	membershipId: z.string(),
	days: z.array(
		z.object({
			day: weekdaySchema,
			windows: z.array(
				z.object({ startTime: z.string(), endTime: z.string() })
			),
		})
	),
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

/** The caller's own pattern; the API resolves the member from the caller. */
export const fetchMyAvailability = (
	companyId: string,
	signal?: AbortSignal
): Promise<WeeklyAvailability> =>
	apiRequest(
		`${companyPath(companyId)}/me/availability`,
		weeklyAvailabilitySchema,
		{ signal }
	);

/** The Department's part-timers without any availability, by name; none when all have some. */
export const fetchPartTimeMembersWithoutAvailability = async (
	companyId: string,
	unit: DepartmentPath,
	signal?: AbortSignal
): Promise<Array<MemberWithoutAvailability>> => {
	const readiness = await apiRequest(
		`${departmentPath(companyId, unit)}/availability-readiness`,
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

/**
 * A Department's part-timers who have no availability. Without `unit`, a
 * Department not chosen or one where it may not be read, nothing is asked.
 */
export const partTimeReadinessQuery = (
	companyId: string,
	unit: DepartmentPath | undefined
): UndefinedInitialDataOptions<
	Array<MemberWithoutAvailability>,
	Error,
	Array<MemberWithoutAvailability>,
	readonly ["people", string, "availability-readiness", string, string]
> =>
	queryOptions({
		queryKey: [
			...readinessRoot(companyId),
			unit?.branchId ?? "",
			unit?.departmentId ?? "",
		] as const,
		queryFn: unit
			? ({ signal }): Promise<Array<MemberWithoutAvailability>> =>
					fetchPartTimeMembersWithoutAvailability(companyId, unit, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		retry,
	});
