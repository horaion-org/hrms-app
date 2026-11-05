import { createFileRoute } from "@tanstack/react-router";
import { memberTermsQuery } from "@/features/employmentTerms/api";
import { memberProfileQuery } from "@/features/people/api";
import { personScope } from "@/features/people/profileEditAccess";
import { parseProfileSearch } from "@/features/people/peopleSearch";
import { workspaceQuery } from "@/features/workspace/api";
import { accessIndexOf, canAt } from "@/features/workspace/scopes";
import { PersonProfile, PersonProfileProblem } from "@/pages/PersonProfile";

export const Route = createFileRoute(
	"/_authenticated/_app/people_/$membershipId"
)({
	validateSearch: parseProfileSearch,
	loader: async ({ context, params }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const [profile, workspace] = await Promise.all([
			context.queryClient.ensureQueryData(
				memberProfileQuery(companyId, params.membershipId)
			),
			// Controls fail closed without the workspace; the profile itself still shows.
			context.queryClient
				.ensureQueryData(workspaceQuery)
				.catch(() => undefined),
		]);
		// Their employment terms start loading with the page when the caller may read them.
		if (
			canAt(
				accessIndexOf(workspace, companyId),
				"member_employment_terms:read",
				personScope(profile)
			)
		)
			void context.queryClient.prefetchQuery(
				memberTermsQuery(companyId, params.membershipId)
			);
	},
	component: PersonProfile,
	errorComponent: PersonProfileProblem,
});
