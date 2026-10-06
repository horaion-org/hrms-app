import { createFileRoute } from "@tanstack/react-router";
import { peopleQuery } from "@/features/people/api";
import {
	parsePeopleSearch,
	peopleQueryOf,
} from "@/features/people/peopleSearch";
import { workspaceQuery } from "@/features/workspace/api";
import { PEOPLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { holdsAnywhere } from "@/features/workspace/scopes";
import { People } from "@/pages/People";

export const Route = createFileRoute("/_authenticated/_app/people")({
	validateSearch: parsePeopleSearch,
	loader: async ({ context, location, cause }) => {
		// Once on the page, the page asks for each change itself: only it knows the search text.
		if (cause === "stay") return;
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		// A failure stays in the cache for the page to explain, rather than replacing it.
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		// Nothing is asked for when the workspace does not grant the list anywhere.
		if (workspace && holdsAnywhere(workspace, companyId, PEOPLE_READ_KEYS))
			await context.queryClient.prefetchQuery(
				peopleQuery(
					companyId,
					peopleQueryOf(parsePeopleSearch(location.search), "")
				)
			);
	},
	component: People,
});
