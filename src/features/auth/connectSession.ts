import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { configureApiClient } from "@/common/api-client";
import {
	accessToken,
	endSession,
	hasAccessPass,
	onSessionEnded,
	renewSession,
} from "@/features/auth/session";

export function connectSession(
	router: AnyRouter,
	queryClient: QueryClient
): () => void {
	let resettling: Promise<void> | undefined;
	configureApiClient({
		accessToken,
		onMembershipRevoked: (path) => {
			// The guard handles /me refusals itself; invalidating it here would loop.
			if (
				resettling ||
				(path === "/api/v1/me" &&
					queryClient.getQueryState(["me"])?.fetchStatus === "fetching")
			)
				return;
			queryClient.removeQueries({ queryKey: ["me"], exact: true });
			resettling = router.invalidate().finally(() => {
				resettling = undefined;
			});
		},
		renew: renewSession,
		onUnauthenticated: () => {
			if (hasAccessPass()) endSession("expired");
		},
	});
	return onSessionEnded((reason) => {
		queryClient.clear();
		const guarded = router.state.matches.some((match) =>
			match.routeId.startsWith("/_authenticated")
		);
		if (!guarded && reason === "expired") return;
		void router.navigate({
			to: "/login",
			replace: true,
			search:
				reason === "expired" ? { redirect: router.state.location.href } : {},
		});
	});
}
