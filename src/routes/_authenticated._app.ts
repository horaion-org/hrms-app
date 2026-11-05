import { createFileRoute, retainSearchParams } from "@tanstack/react-router";
import { myProfileQuery } from "@/features/people/api";
import { workspaceQuery } from "@/features/workspace/api";
import { parseBranchContext } from "@/features/workspace/unitSearch";
import { MainLayout } from "@/pages/MainLayout";

/**
 * Every signed-in page. The Branch the person chose on one list (`branch`
 * in the URL) is carried to every link and navigation that does not set
 * its own, so it follows them across pages and survives a reload. Only the
 * Branch: a Department belongs to the page it was chosen on.
 */
export const Route = createFileRoute("/_authenticated/_app")({
	validateSearch: parseBranchContext,
	search: { middlewares: [retainSearchParams(["branch"])] },
	// The header's Branch defaults to the person's home Branch, so the workspace and their
	// own profile are read before any page shows; a failure stays in the cache to explain.
	loader: async ({ context }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: undefined;
		await Promise.all([
			context.queryClient
				.ensureQueryData(workspaceQuery)
				.catch(() => undefined),
			companyId === undefined
				? undefined
				: context.queryClient
						.ensureQueryData(myProfileQuery(companyId))
						.catch(() => undefined),
		]);
	},
	component: MainLayout,
});
