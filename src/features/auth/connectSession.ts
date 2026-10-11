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

/** The company a refused company path named, if any. */
const companyOfPath = (path: string): string | undefined => {
	const match = /^\/api\/v1\/companies\/([^/?]+)/.exec(path);
	return match?.[1] === undefined ? undefined : decodeURIComponent(match[1]);
};

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
			// Company access is gone: nothing read in that company, the person's own records included, stays on screen.
			const companyId = companyOfPath(path);
			if (companyId !== undefined)
				queryClient.removeQueries({
					predicate: (query) => query.meta?.companyId === companyId,
				});
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
