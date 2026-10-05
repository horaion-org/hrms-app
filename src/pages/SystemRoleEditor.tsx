import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, type ErrorComponentProps } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { AccessRoleForm } from "@/features/organisation/AccessRoleForm";
import { readOnlyReason } from "@/features/organisation/accessRoleReadOnly";
import { SYSTEM_ROLES_PATH } from "@/features/organisation/systemRolesPath";
import { useAccessRoleHolders } from "@/features/organisation/useAccessRoleHolders";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useUpdateAccessRole } from "@/features/organisation/useUpdateAccessRole";
import { companyPermissions, workspaceQuery } from "@/features/workspace/api";
import { isPermissionKey } from "@/features/workspace/permissionKeys";
import { SystemRoleHolders } from "@/pages/SystemRoleHolders";

const route = getRouteApi(
	"/_authenticated/_app/organisation/system-roles_/$accessRoleId"
);
const key = "organisation.accessRoles.editor";
const holdersKey = "organisation.accessRoles.assignments";
/** The `tab` search value that opens the role on its permissions; People is the default. */
export const PERMISSIONS_TAB = "permissions";

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
 * One access role: who has it and where, then its name and permissions on a
 * second tab, where nothing is saved until "Save changes". The role's
 * permissions are shown but can't be changed when it is the Company Owner
 * role, when the person may not change roles, or when it holds a permission
 * the person doesn't: the API refuses any change to such a role.
 */
export const SystemRoleEditor = (): FunctionComponent => {
	const role = route.useLoaderData();
	const navigate = route.useNavigate();
	const { tab } = route.useSearch();
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const { data: workspace } = useSuspenseQuery(workspaceQuery);
	const reason = readOnlyReason(role, companyPermissions(workspace, companyId));
	const update = useUpdateAccessRole(companyId, role.accessRoleId);
	const holders = useAccessRoleHolders(companyId, role.accessRoleId);
	// A person with the role at several places is counted once.
	const people = new Set(
		holders.data?.map((holder) => holder.companyMembershipId)
	).size;
	// Keys newer than this app's catalog can't be shown, so they are saved back untouched.
	const unknown = role.permissions.filter(
		(permission) => !isPermissionKey(permission)
	);

	return (
		<>
			<BackToList />
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<h1 className="text-4xl font-medium text-neutral-900">{role.name}</h1>
				{role.protectedRole && <Badge>{t(`${key}.fullAccess`)}</Badge>}
				{role.status === "INACTIVE" && (
					<Badge>{t("organisation.status.INACTIVE")}</Badge>
				)}
			</div>
			<Tabs
				className="mt-8"
				selectedIndex={tab === PERMISSIONS_TAB ? 1 : 0}
				onChange={(index) => {
					void navigate({
						search: index === 1 ? { tab: PERMISSIONS_TAB } : {},
						replace: true,
					});
				}}
			>
				<TabList aria-label={t(`${holdersKey}.tabs`)}>
					<Tab count={people}>{t(`${holdersKey}.tab`)}</Tab>
					<Tab>{t(`${holdersKey}.permissionsTab`)}</Tab>
				</TabList>
				<TabPanels className="mt-8">
					<TabPanel>
						<SystemRoleHolders holders={holders.data} role={role} />
					</TabPanel>
					<TabPanel>
						{reason && (
							<p className="mb-6 text-sm text-neutral-700">
								{t(`${key}.${reason}`)}
							</p>
						)}
						<AccessRoleForm
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
									status: role.status,
								});
								await navigate({ to: SYSTEM_ROLES_PATH });
							}}
						/>
					</TabPanel>
				</TabPanels>
			</Tabs>
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
