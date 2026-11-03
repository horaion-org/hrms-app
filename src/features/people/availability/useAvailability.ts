import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	memberAvailabilityQuery,
	readinessRoot,
	replaceMemberAvailability,
} from "@/features/people/availability/api";
import type {
	ReplaceAvailabilityRequest,
	WeeklyAvailability,
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
