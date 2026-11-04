import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { forbiddenRedirect } from "@/features/workspace/forbiddenRedirect";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { SystemRoleCreate } from "@/pages/SystemRoleCreate";

export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles_/new"
)({
	// Roles are company-wide, so only a company grant opens the page.
	loader: async ({ context }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient.ensureQueryData(workspaceQuery);
		return forbiddenRedirect({
			workspace,
			companyId,
			permission: "access_role:create",
			target: COMPANY_SCOPE,
		});
	},
	component: SystemRoleCreate,
});
