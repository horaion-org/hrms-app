import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { forbiddenRedirect } from "@/features/workspace/forbiddenRedirect";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { AccessRoleCreate } from "@/pages/AccessRoleCreate";

export const Route = createFileRoute(
	"/_authenticated/_app/settings_/access-roles_/new"
)({
	// Roles are company-wide, so only a company grant opens the page.
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
			permission: "access_role:create",
			target: COMPANY_SCOPE,
		});
	},
	component: AccessRoleCreate,
});
