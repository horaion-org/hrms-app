import { getRouteApi } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import { AccessRoleEditor } from "@/features/accessRoles/AccessRoleEditor";

export { AccessRoleEditorProblem } from "@/features/accessRoles/AccessRoleEditor";

const route = getRouteApi(
	"/_authenticated/_app/settings_/access-roles_/$accessRoleId"
);

/**
 * Settings › Access roles › one role, as the route loaded it. `?tab=permissions`
 * opens it on its permissions; People is the default.
 */
export const AccessRoleEditorPage = (): FunctionComponent => {
	const role = route.useLoaderData();
	const { tab } = route.useSearch();
	const navigate = route.useNavigate();
	return (
		<AccessRoleEditor
			role={role}
			tab={tab ?? "people"}
			onTabChange={(next) => {
				void navigate({
					search: next === "permissions" ? { tab: next } : {},
					replace: true,
				});
			}}
		/>
	);
};
