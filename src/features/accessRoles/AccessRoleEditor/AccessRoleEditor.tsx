import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { AccessRoleHolders } from "@/features/accessRoles/AccessRoleHolders";
import type { AccessRole } from "@/features/accessRoles/api";
import { AccessRoleForm } from "@/features/accessRoles/AccessRoleForm";
import { readOnlyReason } from "@/features/accessRoles/accessRoleReadOnly";
import { ACCESS_ROLES_PATH } from "@/features/accessRoles/accessRolesPath";
import { useAccessRoleHolders } from "@/features/accessRoles/useAccessRoleHolders";
import { useUpdateAccessRole } from "@/features/accessRoles/useUpdateAccessRole";
import { companyPermissions, workspaceQuery } from "@/features/workspace/api";
import {
	isPermissionKey,
	unknownKeys,
} from "@/features/workspace/permissionKeys";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

const key = "organisation.accessRoles.editor";
const holdersKey = "organisation.accessRoles.assignments";

/** The editor's two tabs: who has the role and where, then its name and permissions. */
export type AccessRoleTab = "people" | "permissions";

export type AccessRoleEditorProps = {
	/** The role as just loaded; the form starts from it. */
	role: AccessRole;
	tab: AccessRoleTab;
	onTabChange: (tab: AccessRoleTab) => void;
};

const BackToList = (): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<Button
			leadingIcon={<ArrowLeftIcon />}
			to={ACCESS_ROLES_PATH}
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
export const AccessRoleEditor = ({
	role,
	tab,
	onTabChange,
}: AccessRoleEditorProps): FunctionComponent => {
	const navigate = useNavigate();
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const { data: workspace } = useSuspenseQuery(workspaceQuery);
	const reason = readOnlyReason(role, companyPermissions(workspace, companyId));
	const update = useUpdateAccessRole(companyId, role.accessRoleId);
	const holders = useAccessRoleHolders(companyId, role.accessRoleId);
	// A person with the role at several places is counted once.
	const people = new Set(holders.data?.map((holder) => holder.membershipId))
		.size;
	// Keys newer than this app's catalog are shown locked and saved back untouched.
	const unknown = unknownKeys(role.permissions);

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
				selectedIndex={tab === "permissions" ? 1 : 0}
				onChange={(index) => {
					onTabChange(index === 1 ? "permissions" : "people");
				}}
			>
				<TabList aria-label={t(`${holdersKey}.tabs`)}>
					<Tab count={people}>{t(`${holdersKey}.tab`)}</Tab>
					<Tab>{t(`${holdersKey}.permissionsTab`)}</Tab>
				</TabList>
				<TabPanels className="mt-8">
					<TabPanel>
						<AccessRoleHolders holders={holders.data} role={role} />
					</TabPanel>
					<TabPanel>
						{reason && (
							<p className="mb-6 text-sm text-neutral-700">
								{t(`${key}.${reason}`)}
							</p>
						)}
						{unknown.length > 0 && (
							<p className="mb-6 text-sm text-neutral-700">
								{t(`${key}.unknownKeys`, { count: unknown.length })}
							</p>
						)}
						<AccessRoleForm
							mode="edit"
							readOnly={reason !== undefined}
							unknown={unknown}
							initial={{
								kind: role.kind,
								name: role.name,
								permissions: role.permissions.filter(isPermissionKey),
							}}
							onSubmit={async (values) => {
								await update.mutateAsync({
									kind: values.kind,
									name: values.name,
									permissions: [...values.permissions, ...unknown],
									status: role.status,
								});
								await navigate({ to: ACCESS_ROLES_PATH });
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
export const AccessRoleEditorProblem = ({
	error,
}: {
	error: unknown;
}): FunctionComponent => {
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
