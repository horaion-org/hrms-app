import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { accessRoleRowRefusal } from "@/features/organisation/accessRoleRefusal";
import { AccessRoleStatusDialog } from "@/features/organisation/AccessRoleStatusDialog";
import type { AccessRole } from "@/features/organisation/api";
import { CreateSystemRoleDialog } from "@/features/organisation/CreateSystemRoleDialog";
import { useAccessRoleHolders } from "@/features/organisation/useAccessRoleHolders";
import {
	useDeleteAccessRole,
	useSetAccessRoleStatus,
} from "@/features/organisation/useChangeListRow";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";

/** What the person chose from a role's "More actions" menu. */
export type SystemRoleAction = {
	kind: "status" | "delete" | "duplicate";
	role: AccessRole;
};

type Props = { role: AccessRole; onClose: () => void };

/** Activates or deactivates the role once the person has seen who it affects. */
const ChangeStatus = ({ role, onClose }: Props): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const membershipId = useCurrentMembershipId();
	const { t } = useTranslation();
	const holders = useAccessRoleHolders(companyId, role.accessRoleId);
	const change = useSetAccessRoleStatus(companyId);
	const error = holders.isError
		? t("organisation.accessRoles.status.loadFailed")
		: change.error
			? accessRoleRowRefusal(change.error, "status", t)
			: undefined;

	return (
		<AccessRoleStatusDialog
			error={error}
			holders={holders.data}
			role={role}
			submitting={change.isPending}
			affectsSelf={
				holders.data?.some((holder) => holder.membershipId === membershipId) ??
				false
			}
			onClose={onClose}
			onConfirm={() => {
				change.mutate(
					{
						row: role,
						status: role.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
					},
					{ onSuccess: onClose }
				);
			}}
		/>
	);
};

/** Deletes a role nobody holds, after asking. */
const DeleteRole = ({ role, onClose }: Props): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const remove = useDeleteAccessRole(companyId);

	return (
		<ConfirmDialog
			cancelLabel={t("organisation.list.cancel")}
			confirmLabel={t("organisation.accessRoles.delete.confirm")}
			description={t("organisation.accessRoles.delete.description")}
			submitting={remove.isPending}
			title={t("organisation.accessRoles.delete.title", { name: role.name })}
			error={
				remove.error
					? accessRoleRowRefusal(remove.error, "delete", t)
					: undefined
			}
			onClose={onClose}
			onConfirm={() => {
				remove.mutate(role, { onSuccess: onClose });
			}}
		/>
	);
};

/**
 * The dialog for one action on a system role's list row. A duplicate starts
 * from the role's name and the permissions the person may grant.
 */
export const SystemRoleActionDialog = ({
	action,
	heldPermissions,
	onClose,
}: {
	action: SystemRoleAction;
	heldPermissions: ReadonlySet<string>;
	onClose: () => void;
}): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const { kind, role } = action;
	if (kind === "status") return <ChangeStatus role={role} onClose={onClose} />;
	if (kind === "delete") return <DeleteRole role={role} onClose={onClose} />;
	return (
		<CreateSystemRoleDialog
			companyId={companyId}
			heldPermissions={heldPermissions}
			initial={{
				name: t("organisation.accessRoles.copyName", { name: role.name }),
				permissions: role.permissions.filter((permission) =>
					heldPermissions.has(permission)
				),
			}}
			onClose={onClose}
		/>
	);
};
