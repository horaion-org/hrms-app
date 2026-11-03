import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	deleteMemberWeekAvailability,
	memberAvailabilityQuery,
	readinessRoot,
	replaceMemberAvailability,
	replaceMemberWeekAvailability,
	weekAvailabilityQuery,
	type AvailabilityOwner,
} from "@/features/people/availability/api";
import {
	effectiveWindows,
	hasOverride,
	windowsOf,
	type AvailabilityScope,
	type ReplaceAvailabilityRequest,
	type WeekAvailability,
	type WeeklyAvailability,
	type WeeklyWindow,
} from "@/features/people/availability/availabilityModel";

/** Replaces a member's pattern with the complete new set, keeps what the API saved, and reloads readiness. */
export const useReplaceMemberAvailability = (
	companyId: string,
	membershipId: string
): UseMutationResult<WeeklyAvailability, Error, ReplaceAvailabilityRequest> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (request) =>
			replaceMemberAvailability(companyId, membershipId, request),
		onSuccess: (saved) => {
			client.setQueryData(
				memberAvailabilityQuery(companyId, membershipId).queryKey,
				saved
			);
			return client.invalidateQueries({ queryKey: readinessRoot(companyId) });
		},
	});
};

/**
 * The windows in force for `scope`: a week's override, read only for a
 * week the pattern lists as having one, else the pattern. Undefined while
 * loading; `failed` when what was asked for could not be read.
 */
export const useEffectiveAvailability = (
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

type WeekChange = {
	weekStartMonday: string;
	request: ReplaceAvailabilityRequest;
};

/**
 * After a week is changed: the pattern is read again for the weeks it
 * lists as overridden, and every readiness for what it now says.
 */
const useAfterWeekChange = (
	companyId: string,
	membershipId: string
): ((
	weekStartMonday: string,
	saved: WeekAvailability | null
) => Promise<void>) => {
	const client = useQueryClient();
	const owner = { kind: "member", membershipId } as const;
	return async (weekStartMonday, saved) => {
		client.setQueryData(
			weekAvailabilityQuery(companyId, owner, weekStartMonday).queryKey,
			saved
		);
		await Promise.all([
			client.invalidateQueries({
				queryKey: memberAvailabilityQuery(companyId, membershipId).queryKey,
				exact: true,
			}),
			client.invalidateQueries({ queryKey: readinessRoot(companyId) }),
		]);
	};
};

/** Gives one week of a member's its own windows; an empty set means not available that week. */
export const useReplaceMemberWeekAvailability = (
	companyId: string,
	membershipId: string
): UseMutationResult<WeekAvailability, Error, WeekChange> => {
	const afterWeekChange = useAfterWeekChange(companyId, membershipId);
	return useMutation({
		mutationFn: ({ weekStartMonday, request }) =>
			replaceMemberWeekAvailability(
				companyId,
				membershipId,
				weekStartMonday,
				request
			),
		onSuccess: (saved, { weekStartMonday }) =>
			afterWeekChange(weekStartMonday, saved),
	});
};

/** Returns one week of a member's to their default pattern. */
export const useResetMemberWeekAvailability = (
	companyId: string,
	membershipId: string
): UseMutationResult<void, Error, string> => {
	const afterWeekChange = useAfterWeekChange(companyId, membershipId);
	return useMutation({
		mutationFn: (weekStartMonday) =>
			deleteMemberWeekAvailability(companyId, membershipId, weekStartMonday),
		onSuccess: (_, weekStartMonday) => afterWeekChange(weekStartMonday, null),
	});
};
