import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { AccessRoleForm } from "@/features/organisation/AccessRoleForm";
import type { AccessRoleFormValues } from "@/features/organisation/accessRoleFormSchema";
import { SYSTEM_ROLES_PATH } from "@/features/organisation/systemRolesPath";
import { useCreateAccessRole } from "@/features/organisation/useCreateAccessRole";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { companyPermissions, workspaceQuery } from "@/features/workspace/api";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const key = "organisation.accessRoles.editor";
const EMPTY: AccessRoleFormValues = { name: "", permissions: [] };

/**
 * A new access role. The person can only give it permissions they hold
 * company-wide, because the API refuses a role holding any other.
 */
export const SystemRoleCreate = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { data: workspace } = useSuspenseQuery(workspaceQuery);
	const held = companyPermissions(workspace, companyId);
	const unavailable = PERMISSION_KEYS.filter((item) => !held.has(item));
	const create = useCreateAccessRole(companyId);

	return (
		<>
			<Button
				leadingIcon={<ArrowLeftIcon />}
				to={SYSTEM_ROLES_PATH}
				variant="textlink"
			>
				{t(`${key}.back`)}
			</Button>
			<h1 className="mt-4 text-4xl font-medium text-neutral-900">
				{t(`${key}.createTitle`)}
			</h1>
			{held.has("access_role:create") ? (
				<>
					<p className="mt-4 text-sm text-neutral-800">{t(`${key}.scope`)}</p>
					{unavailable.length > 0 && (
						<p className="mt-4 text-sm text-neutral-700">
							{t(`${key}.unavailable`)}
						</p>
					)}
					<AccessRoleForm
						className="mt-10"
						initial={EMPTY}
						mode="create"
						unavailable={unavailable}
						onSubmit={async (values) => {
							await create.mutateAsync(values);
							await navigate({ to: SYSTEM_ROLES_PATH });
						}}
					/>
				</>
			) : (
				<p className="mt-4 text-sm text-neutral-700">
					{t(`${key}.createForbidden`)}
				</p>
			)}
		</>
	);
};
