import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { configureApiClient } from "@/common/api-client";
import {
	accessToken,
	endSession,
	onSessionEnded,
	renewSession,
} from "@/features/auth/session";

const GUARDED = "/_authenticated";

/**
 * Wires the Session holder into the request helper, the query cache and the
 * router. Once the Session ends, the cache is cleared and a guarded page is
 * left for sign-in; unless this tab signed out on purpose, sign-in is given
 * the page to return to. Returns a function that disconnects the listener.
 */
export function connectSession(
	router: AnyRouter,
	queryClient: QueryClient
): () => void {
	configureApiClient({
		accessToken,
		renew: renewSession,
		onUnauthenticated: () => {
			endSession("expired");
		},
	});

	return onSessionEnded((reason) => {
		queryClient.clear();

		const onGuardedPage = router.state.matches.some(
			(match: { routeId: string }) => match.routeId.startsWith(GUARDED)
		);

		if (!onGuardedPage) {
			return;
		}

		void router.navigate({
			to: "/sign-in",
			search:
				reason === "signed-out" ? {} : { redirect: router.state.location.href },
		});
	});
}
