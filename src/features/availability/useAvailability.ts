import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	availabilityRoot,
	availabilityListQuery,
	deleteWeekAvailability,
	memberAvailabilityQuery,
	memberOwner,
	MY_AVAILABILITY,
	myAvailabilityQuery,
	replaceAvailability,
	replaceWeekAvailability,
	weekAvailabilityQuery,
	type AvailabilityOwner,
	type AvailabilityListQuery,
	type MemberWeek,
} from "@/features/availability/api";
import {
	effectiveWindows,
	hasOverride,
	isPartTime,
	windowsOf,
	type AvailabilityScope,
	type ReplaceAvailabilityRequest,
	type WeekAvailability,
	type WeeklyAvailability,
	type WeeklyWindow,
} from "@/features/availability/availabilityModel";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { myProfileQuery } from "@/features/people/api";
import { AVAILABILITY_READ_KEYS } from "@/features/workspace/permissionKeys";
import { useAccess } from "@/features/workspace/useAccess";

/** A 403: the person's grants don't reach what was asked for, whatever the workspace said. */
const isRefused = (error: Error | null): boolean =>
	error instanceof ApiProblemError && error.status === 403;

/**
 * Which tabs of the Availability page the person has, from data, never
 * roles: Mine for a part-timer, Team for anyone holding
 * `work_availability:read` somewhere. `pending` until both are known.
 */
export type AvailabilityViews = {
	status: "pending" | "ready";
	mine: boolean;
	team: boolean;
};

export const useAvailabilityViews = (): AvailabilityViews => {
	const companyId = useCurrentCompanyId();
	const access = useAccess();
	const profile = useQuery({
		...myProfileQuery(companyId),
		enabled: companyId !== "",
	});
	return {
		status:
			profile.isPending || access.status === "pending" ? "pending" : "ready",
		mine: isPartTime(profile.data?.employmentType),
		team: access.canAny(AVAILABILITY_READ_KEYS, "anywhere"),
	};
};

/**
 * The windows in force for `scope`: a week's override, read only for a
 * week the pattern lists as having one, else the pattern. Undefined while
 * loading; `failed` when what was asked for could not be read.
 */
const useEffectiveAvailability = (
	companyId: string,
	owner: AvailabilityOwner,
	pattern: WeeklyAvailability | undefined,
	scope: AvailabilityScope
): { windows: Array<WeeklyWindow> | undefined; failed: boolean } => {
	const overridden =
		pattern !== undefined && hasOverride(scope, pattern.overrideWeeks);
	const week = useQuery(
		weekAvailabilityQuery(
			companyId,
			owner,
			overridden && scope.kind === "week" ? scope.weekStartMonday : undefined
		)
	);
	if (!pattern || (overridden && week.data === undefined))
		return { windows: undefined, failed: overridden && week.isError };
	return {
		windows: effectiveWindows(
			windowsOf(pattern),
			overridden && week.data ? windowsOf(week.data) : null
		),
		failed: false,
	};
};

/** The caller's own pattern and one week of it: what is in force, and whether the week has its own. */
export type MyAvailability =
	| { status: "pending" | "error" }
	| {
			status: "ready";
			pattern: WeeklyAvailability;
			week: Array<WeeklyWindow>;
			overridden: boolean;
	  };

/**
 * The caller's own availability for the week starting `weekStartMonday`.
 * It never consults the workspace: a part-timer needs nothing granted.
 * `wanted` false, for someone not part-time, asks for nothing.
 */
export const useMyAvailability = (
	companyId: string,
	weekStartMonday: string,
	wanted = true
): MyAvailability => {
	const pattern = useQuery(myAvailabilityQuery(companyId, wanted));
	const scope: AvailabilityScope = { kind: "week", weekStartMonday };
	const { windows, failed } = useEffectiveAvailability(
		companyId,
		MY_AVAILABILITY,
		pattern.data,
		scope
	);
	if (pattern.isError || failed) return { status: "error" };
	if (!pattern.data || !windows) return { status: "pending" };
	return {
		status: "ready",
		pattern: pattern.data,
		week: windows,
		overridden: hasOverride(scope, pattern.data.overrideWeeks),
	};
};

/** A colleague's pattern; `hidden` when the API refuses it. */
export type MemberAvailability =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; pattern: WeeklyAvailability };

/** A colleague's weekly pattern, to edit it; `wanted` false asks for nothing. */
export const useMemberAvailability = (
	companyId: string,
	membershipId: string,
	wanted = true
): MemberAvailability => {
	const pattern = useQuery(
		memberAvailabilityQuery(companyId, membershipId, wanted)
	);
	if (isRefused(pattern.error)) return { status: "hidden" };
	if (pattern.isError) return { status: "error" };
	if (pattern.data === undefined) return { status: "pending" };
	return { status: "ready", pattern: pattern.data };
};

/**
 * One Branch's part-timers for one week, from the company's list. `hidden` when the person's grants
 * don't reach it anywhere, whether the workspace says so up front or the
 * API refuses with a 403. The API lists only the members in units where
 * the key is held, so the rows are never trimmed here.
 */
export type TeamAvailabilityList =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; members: Array<MemberWeek> };

/** `query` undefined, or `wanted` false, asks for nothing and stays pending. */
export const useAvailabilityList = (
	companyId: string,
	query: AvailabilityListQuery | undefined,
	wanted = true
): TeamAvailabilityList => {
	const access = useAccess();
	const allowed = access.canAny(AVAILABILITY_READ_KEYS, "anywhere");
	const list = useQuery(
		availabilityListQuery(
			companyId,
			query ?? { weekStartMonday: "", branchId: "" },
			allowed && wanted && query !== undefined
		)
	);
	if (access.status !== "ready") return { status: access.status };
	if (!allowed || isRefused(list.error)) return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", members: list.data.members };
};

/** Reloads every availability entry of the company: patterns, weeks, Branch weeks and readiness. */
const useReloadAvailability = (companyId: string): (() => Promise<void>) => {
	const client = useQueryClient();
	return () =>
		client.invalidateQueries({ queryKey: availabilityRoot(companyId) });
};

type WeekChange = {
	weekStartMonday: string;
	request: ReplaceAvailabilityRequest;
};

const useReplaceAvailability = (
	companyId: string,
	owner: AvailabilityOwner
): UseMutationResult<WeeklyAvailability, Error, ReplaceAvailabilityRequest> => {
	const reload = useReloadAvailability(companyId);
	return useMutation({
		mutationFn: (request) => replaceAvailability(companyId, owner, request),
		onSuccess: reload,
	});
};

const useReplaceWeekAvailability = (
	companyId: string,
	owner: AvailabilityOwner
): UseMutationResult<WeekAvailability, Error, WeekChange> => {
	const reload = useReloadAvailability(companyId);
	return useMutation({
		mutationFn: ({ weekStartMonday, request }) =>
			replaceWeekAvailability(companyId, owner, weekStartMonday, request),
		onSuccess: reload,
	});
};

const useResetWeekAvailability = (
	companyId: string,
	owner: AvailabilityOwner
): UseMutationResult<void, Error, string> => {
	const reload = useReloadAvailability(companyId);
	return useMutation({
		mutationFn: (weekStartMonday) =>
			deleteWeekAvailability(companyId, owner, weekStartMonday),
		onSuccess: reload,
	});
};

/** Replaces a colleague's pattern with the complete new set. */
export const useReplaceMemberAvailability = (
	companyId: string,
	membershipId: string
): UseMutationResult<WeeklyAvailability, Error, ReplaceAvailabilityRequest> =>
	useReplaceAvailability(companyId, memberOwner(membershipId));

/** Gives one week of a colleague's its own windows; an empty set means not available that week. */
export const useReplaceMemberWeekAvailability = (
	companyId: string,
	membershipId: string
): UseMutationResult<WeekAvailability, Error, WeekChange> =>
	useReplaceWeekAvailability(companyId, memberOwner(membershipId));

/** Returns one week of a colleague's to their default pattern. */
export const useResetMemberWeekAvailability = (
	companyId: string,
	membershipId: string
): UseMutationResult<void, Error, string> =>
	useResetWeekAvailability(companyId, memberOwner(membershipId));

/** Replaces the caller's own pattern with the complete new set; nothing granted is needed. */
export const useReplaceMyAvailability = (
	companyId: string
): UseMutationResult<WeeklyAvailability, Error, ReplaceAvailabilityRequest> =>
	useReplaceAvailability(companyId, MY_AVAILABILITY);

/** Gives one week of the caller's own its own windows. */
export const useReplaceMyWeekAvailability = (
	companyId: string
): UseMutationResult<WeekAvailability, Error, WeekChange> =>
	useReplaceWeekAvailability(companyId, MY_AVAILABILITY);

/** Returns one week of the caller's own to their default pattern. */
export const useResetMyWeekAvailability = (
	companyId: string
): UseMutationResult<void, Error, string> =>
	useResetWeekAvailability(companyId, MY_AVAILABILITY);
