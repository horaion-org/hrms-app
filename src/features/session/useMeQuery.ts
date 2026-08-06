import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { Me, Membership } from "@/common/api";
import { fetchMe } from "@/features/session/api";

export const meQueryKey = ["session", "me"] as const;

export function useMeQuery(): UseQueryResult<Me, Error> {
	return useQuery({
		queryKey: meQueryKey,
		queryFn: fetchMe,
		// Membership status is enforced by the API on every request, so this is
		// a convenience cache rather than an authority. Refetch on focus so a
		// revoked member does not sit in a stale shell.
		staleTime: 30_000,
	});
}

/**
 * The Membership whose Company scopes every request. Business rules allow one
 * Membership per User today; the shape anticipates a switcher without one
 * existing. See docs/adr/0003-company-implicit-in-app-urls.md.
 */
export function activeMembership(me: Me | undefined): Membership | undefined {
	return me?.memberships.find((membership) => membership.status === "ACTIVE");
}
