import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	PEOPLE_TAB,
	PERMISSIONS_TAB,
	type RoleTabSearch,
} from "@/features/organisation/accessRoleTabs";

/**
 * One access role, at its old address: it now lives under Settings. The
 * role and the tab asked for are kept, so old links still open the same view.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/organisation/system-roles_/$accessRoleId"
)({
	validateSearch: (search: Record<string, unknown>): RoleTabSearch => {
		const tab = search["tab"];
		return tab === PEOPLE_TAB || tab === PERMISSIONS_TAB ? { tab } : {};
	},
	beforeLoad: ({ params, search }) =>
		redirect({
			to: "/settings/access-roles/$accessRoleId",
			params,
			search,
			replace: true,
		}),
});
