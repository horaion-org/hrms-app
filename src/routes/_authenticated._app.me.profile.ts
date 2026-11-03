import { createFileRoute } from "@tanstack/react-router";
import { myProfileQuery } from "@/features/people/api";
import { MyProfile, MyProfileProblem } from "@/pages/MyProfile";

export const Route = createFileRoute("/_authenticated/_app/me/profile")({
	loader: ({ context }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		return context.queryClient.ensureQueryData(myProfileQuery(companyId));
	},
	component: MyProfile,
	errorComponent: MyProfileProblem,
});
