import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * One access role, at its old address: it now lives under Settings. The
 * role and the tab asked for are kept, so old links still open the same view.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles_/$accessRoleId"
)({
	validateSearch: (search: Record<string, unknown>): { tab?: "permissions" } =>
		search["tab"] === "permissions" ? { tab: "permissions" } : {},
	beforeLoad: ({ params, search }) =>
		redirect({
			to: "/settings/access-roles/$accessRoleId",
			params,
			search,
			replace: true,
		}),
});
