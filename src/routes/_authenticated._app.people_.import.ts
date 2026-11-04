import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The People import's old address: it now lives under Settings › Data. The
 * import being followed is kept, so old links and bookmarks still open it.
 */
export const Route = createFileRoute("/_authenticated/_app/people_/import")({
	validateSearch: (search: Record<string, unknown>): { import?: string } =>
		typeof search["import"] === "string" && search["import"] !== ""
			? { import: search["import"] }
			: {},
	beforeLoad: ({ search }) =>
		redirect({ to: "/settings/data/import-people", search, replace: true }),
});
