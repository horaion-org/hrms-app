import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, type ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { AccessRoleForm } from "@/features/organisation/AccessRoleForm";
import { readOnlyReason } from "@/features/organisation/accessRoleReadOnly";
import { SYSTEM_ROLES_PATH } from "@/features/organisation/systemRolesPath";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useUpdateAccessRole } from "@/features/organisation/useUpdateAccessRole";
import { companyPermissions, workspaceQuery } from "@/features/workspace/api";
import { isPermissionKey } from "@/features/workspace/permissionKeys";

const route = getRouteApi(
	"/_authenticated/_app/organisation/system-roles_/$accessRoleId"
);
const key = "organisation.accessRoles.editor";

const BackToList = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button
			leadingIcon={<ArrowLeftIcon />}
			to={SYSTEM_ROLES_PATH}
			variant="textlink"
		>
			{t(`${key}.back`)}
		</Button>
	);
};

/**
 * One access role's name and permissions. Nothing is saved until "Save
 * changes". The role is shown but can't be changed when it is the Company
 * Owner role, when the person may not change roles, or when it holds a
 * permission the person doesn't: the API refuses any change to such a role.
 */
export const SystemRoleEditor = (): FunctionComponent => {
	const role = route.useLoaderData();
	const navigate = route.useNavigate();
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const { data: workspace } = useSuspenseQuery(workspaceQuery);
	const reason = readOnlyReason(role, companyPermissions(workspace, companyId));
	const update = useUpdateAccessRole(companyId, role.accessRoleId);
	// Keys newer than this app's catalog can't be shown, so they are saved back untouched.
	const unknown = role.permissions.filter(
		(permission) => !isPermissionKey(permission)
	);

	return (
		<>
			<BackToList />
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<h1 className="text-4xl font-medium text-neutral-900">
					{t(reason ? `${key}.viewTitle` : `${key}.title`)}
				</h1>
				{role.protectedRole && <Badge>{t(`${key}.fullAccess`)}</Badge>}
			</div>
			<p className="mt-4 text-sm text-neutral-800">{t(`${key}.scope`)}</p>
			{reason && (
				<p className="mt-4 text-sm text-neutral-700">{t(`${key}.${reason}`)}</p>
			)}
			<AccessRoleForm
				className="mt-10"
				mode="edit"
				readOnly={reason !== undefined}
				initial={{
					name: role.name,
					permissions: role.permissions.filter(isPermissionKey),
				}}
				onSubmit={async (values) => {
					await update.mutateAsync({
						name: values.name,
						permissions: [...values.permissions, ...unknown],
					});
					await navigate({ to: SYSTEM_ROLES_PATH });
				}}
			/>
		</>
	);
};

/** A malformed id is refused as a bad request; to the person it is the same as no such role. */
const loadProblem = (
	error: unknown
): "loadForbidden" | "loadMissing" | "loadFailed" => {
	if (!(error instanceof ApiProblemError)) return "loadFailed";
	if (error.status === 403) return "loadForbidden";
	if (error.status === 404 || error.status === 400) return "loadMissing";
	return "loadFailed";
};

/** Shown in place of the editor when the role can't be loaded. */
export const SystemRoleEditorProblem = ({
	error,
}: ErrorComponentProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<>
			<BackToList />
			<p className="mt-8 text-sm text-error-700" role="alert">
				{t(`${key}.${loadProblem(error)}`)}
			</p>
		</>
	);
};
