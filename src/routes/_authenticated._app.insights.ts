import { createFileRoute, redirect } from "@tanstack/react-router";

/** Reports' old address, Insights: old links and bookmarks still open it, with their dates and units. */
export const Route = createFileRoute("/_authenticated/_app/insights")({
	beforeLoad: ({ search }) =>
		redirect({ to: "/reports", search, replace: true }),
});
