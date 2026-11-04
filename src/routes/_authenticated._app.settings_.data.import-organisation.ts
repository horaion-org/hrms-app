import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { forbiddenRedirect } from "@/features/workspace/forbiddenRedirect";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { OrganisationImport } from "@/pages/OrganisationImport";

/** The import whose result is shown, if any, so a refresh or a link from Import history reopens it. */
type OrganisationImportSearch = { import?: string };

export const Route = createFileRoute(
	"/_authenticated/_app/settings_/data/import-organisation"
)({
	validateSearch: (
		search: Record<string, unknown>
	): OrganisationImportSearch =>
		typeof search["import"] === "string" && search["import"] !== ""
			? { import: search["import"] }
			: {},
	loader: async ({ context }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient.ensureQueryData(workspaceQuery);
		return forbiddenRedirect({
			workspace,
			companyId,
			permission: "branch:create",
			target: COMPANY_SCOPE,
		});
	},
	component: OrganisationImport,
});
