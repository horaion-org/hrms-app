import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { forbiddenRedirect } from "@/features/workspace/forbiddenRedirect";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { RecentActivity } from "@/pages/RecentActivity";

export const Route = createFileRoute("/_authenticated/_app/activity")({
	validateSearch: (search: Record<string, unknown>): { page?: number } => {
		const page = Number(search["page"]);
		return Number.isInteger(page) && page > 1 ? { page } : {};
	},
	// A workspace failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		// Undefined until a person with several companies has chosen one.
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: undefined;
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		return forbiddenRedirect({
			workspace,
			companyId,
			permission: "audit_event:read",
			target: COMPANY_SCOPE,
		});
	},
	component: RecentActivity,
});
