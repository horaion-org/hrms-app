import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { forbiddenRedirect } from "@/features/workspace/forbiddenRedirect";
import { AddEmployee } from "@/pages/AddEmployee";

export const Route = createFileRoute("/_authenticated/_app/people_/new")({
	loader: async ({ context }) => {
		// Undefined until a person with several companies has chosen one.
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: undefined;
		const workspace = await context.queryClient.ensureQueryData(workspaceQuery);
		return forbiddenRedirect({
			workspace,
			companyId,
			permission: "member_profile:create",
			target: "anywhere",
		});
	},
	component: AddEmployee,
});
