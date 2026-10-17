import { createFileRoute } from "@tanstack/react-router";
import { fetchAccessRole } from "@/features/organisation/api";
import { workspaceQuery } from "@/features/workspace/api";
import {
	SystemRoleEditor,
	SystemRoleEditorProblem,
} from "@/pages/SystemRoleEditor";

export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles_/$accessRoleId"
)({
	validateSearch: (search: Record<string, unknown>): { tab?: "permissions" } =>
		search["tab"] === "permissions" ? { tab: "permissions" } : {},
	// Fetched afresh on every visit: an edit must start from the role as it is now.
	// Don't mount the form from a cached snapshot while revalidating in the background:
	// its default values are captured on mount.
	gcTime: 0,
	loader: async ({ context, params }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const [role] = await Promise.all([
			fetchAccessRole(companyId, params.accessRoleId),
			context.queryClient.ensureQueryData(workspaceQuery),
		]);
		return role;
	},
	component: SystemRoleEditor,
	errorComponent: SystemRoleEditorProblem,
});
