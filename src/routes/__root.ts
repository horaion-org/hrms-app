import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { SignedOutNotFound } from "@/pages/SignedOutNotFound";

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	// Signed-in addresses are caught by the app layout's catch-all route; this covers the rest.
	notFoundComponent: SignedOutNotFound,
});
