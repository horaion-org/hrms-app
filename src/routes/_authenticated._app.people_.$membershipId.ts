import { createFileRoute } from "@tanstack/react-router";
import { memberProfileQuery } from "@/features/people/api";
import { parseProfileSearch } from "@/features/people/peopleSearch";
import { workspaceQuery } from "@/features/workspace/api";
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
		await Promise.all([
			context.queryClient.ensureQueryData(
				memberProfileQuery(companyId, params.membershipId)
			),
			context.queryClient.ensureQueryData(workspaceQuery),
		]);
	},
	component: PersonProfile,
	errorComponent: PersonProfileProblem,
});
