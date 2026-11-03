import { createFileRoute } from "@tanstack/react-router";
import { myProfileQuery } from "@/features/people/api";
import { myAvailabilityQuery } from "@/features/people/availability/api";
import { isPartTime } from "@/features/people/availability/availabilityModel";
import { MyProfile, MyProfileProblem } from "@/pages/MyProfile";

export const Route = createFileRoute("/_authenticated/_app/me/profile")({
	loader: async ({ context }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const profile = await context.queryClient.ensureQueryData(
			myProfileQuery(companyId)
		);
		// A part-timer's own availability opens with the page; a failure is the card's to say.
		if (isPartTime(profile.employmentType))
			await context.queryClient.prefetchQuery(myAvailabilityQuery(companyId));
		return profile;
	},
	component: MyProfile,
	errorComponent: MyProfileProblem,
});
