import { createFileRoute } from "@tanstack/react-router";
import { allTermsQuery } from "@/features/employmentTerms/api";
import { myProfileQuery, peopleQuery } from "@/features/people/api";
import {
	parsePeopleSearch,
	PEOPLE_UNIT_RULES,
	peopleQueryOf,
} from "@/features/people/peopleSearch";
import { workspaceQuery } from "@/features/workspace/api";
import { PEOPLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { accessIndexOf, canAny } from "@/features/workspace/scopes";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import {
	resolveWorkspaceUnits,
	selectedUnits,
} from "@/features/workspace/unitSelection";
import { People } from "@/pages/People";

export const Route = createFileRoute("/_authenticated/_app/people")({
	validateSearch: parsePeopleSearch,
	// The header shows the Branch people are listed in.
	staticData: {
		branchScope: { keys: PEOPLE_READ_KEYS, rulesFor: () => PEOPLE_UNIT_RULES },
	},
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
		const access = accessIndexOf(workspace, companyId);
		// Nothing is asked for when the workspace does not grant the list anywhere.
		if (canAny(access, PEOPLE_READ_KEYS, "anywhere")) {
			const search = parsePeopleSearch(location.search);
			// The person's home Branch is the default; a failure (no profile of their own) leaves it out.
			const home = await context.queryClient
				.ensureQueryData(myProfileQuery(companyId))
				.catch(() => undefined);
			// The units the page will show, so its first list is the one fetched here.
			const units = resolveWorkspaceUnits(
				workspace,
				companyId,
				PEOPLE_READ_KEYS,
				unitSelectionOf(search),
				PEOPLE_UNIT_RULES,
				home?.branchId ?? undefined
			);
			// The terms filter, and the terms it offers, only for whoever may read people's terms.
			const canFilterByTerms = canAny(
				access,
				["member_employment_terms:read"],
				"anywhere"
			);
			await Promise.all([
				context.queryClient.prefetchQuery(
					peopleQuery(
						companyId,
						peopleQueryOf(search, "", selectedUnits(units), canFilterByTerms)
					)
				),
				canFilterByTerms &&
					context.queryClient.prefetchQuery(allTermsQuery(companyId)),
			]);
		}
	},
	component: People,
});
