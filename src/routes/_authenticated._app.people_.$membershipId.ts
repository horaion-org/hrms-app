import { createFileRoute } from "@tanstack/react-router";
import { memberProfileQuery } from "@/features/people/api";
import { memberAvailabilityQuery } from "@/features/people/availability/api";
import { isPartTime } from "@/features/people/availability/availabilityModel";
import { parseProfileSearch } from "@/features/people/peopleSearch";
import { availabilityReadAccess } from "@/features/people/profileEditAccess";
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
		const index = accessIndexOf(workspace, companyId);
		// A part-timer's availability opens with the page, where it may be read; a failure is the card's to say.
		if (
			isPartTime(profile.employmentType) &&
			availabilityReadAccess(profile, (key, target) =>
				canAt(index, key, target)
			)
		)
			await context.queryClient.prefetchQuery(
				memberAvailabilityQuery(companyId, params.membershipId)
			);
	},
	component: PersonProfile,
	errorComponent: PersonProfileProblem,
});
