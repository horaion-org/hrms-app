import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { forbiddenRedirect } from "@/features/workspace/forbiddenRedirect";
import { PeopleImport } from "@/pages/PeopleImport";

/** The import being followed, if any, so a refresh or a link from Recent imports reopens its result. */
type PeopleImportSearch = { import?: string };

export const Route = createFileRoute("/_authenticated/_app/people_/import")({
	validateSearch: (search: Record<string, unknown>): PeopleImportSearch =>
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
			permission: "member_profile:create",
			target: "anywhere",
		});
	},
	component: PeopleImport,
});
