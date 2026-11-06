import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { configureApiClient } from "@/common/api-client";
import {
	accessToken,
	endSession,
	hasAccessPass,
	onSessionEnded,
	renewSession,
	type SessionEndReason,
} from "@/features/auth/session";

/** Whether a signed-in page is showing, which ending the Session must leave. */
const onSignedInPage = (router: AnyRouter): boolean =>
	router.state.matches.some((match) =>
		match.routeId.startsWith("/_authenticated")
	);

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
	const leaveForLogIn = async (reason: SessionEndReason): Promise<void> => {
		try {
			if (!onSignedInPage(router) && reason === "expired") return;
			// Past any blocker: a blocked navigation never settles, and the cache would never be cleared.
			await router.navigate({
				to: "/login",
				replace: true,
				ignoreBlocker: true,
				search:
					reason === "expired" ? { redirect: router.state.location.href } : {},
			});
		} finally {
			// Only once Log in has replaced the signed-in page: its queries are still observed until then, and a
			// cleared cache lets them re-create themselves empty and fetch, which asks for a Session renewal.
			queryClient.clear();
		}
	};
	return onSessionEnded((reason) => {
		void leaveForLogIn(reason);
	});
}
