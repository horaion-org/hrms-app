import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
	AccessRoleAssignments,
	type AccessRoleAssignmentRow,
} from "@/features/organisation/AccessRoleAssignments";
import type { AccessRole } from "@/features/organisation/api";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import { isPermissionKey } from "@/features/workspace/permissionKeys";

export type AccessRoleStatusDialogProps = {
	/** The role as it is now: an active role is being deactivated, an inactive one activated. */
	role: AccessRole;
	/** Who holds the role and where; `undefined` until that is known. */
	holders: ReadonlyArray<AccessRoleAssignmentRow> | undefined;
	/** True when the person deciding holds the role themselves. */
	affectsSelf: boolean;
	submitting?: boolean;
	/** Why the holders couldn't be loaded or the last attempt failed. */
	error?: string;
	onConfirm: () => void;
	onClose: () => void;
};

/**
 * Asks before an access role is activated or deactivated, showing exactly
 * who gains or loses what. Confirming waits until the holders are known, so
 * nobody switches a role off without having seen who it affects.
 */
export const AccessRoleStatusDialog = ({
	role,
	holders,
	affectsSelf,
	submitting,
	error,
	onConfirm,
	onClose,
}: AccessRoleStatusDialogProps): FunctionComponent => {
	const { t } = useTranslation();
	const key =
		role.status === "ACTIVE"
			? "organisation.accessRoles.status.deactivate"
			: "organisation.accessRoles.status.activate";
	// A person with the role at several places is counted once.
	const count = new Set(holders?.map((holder) => holder.membershipId)).size;

	return (
		<ConfirmDialog
			cancelLabel={t("organisation.list.cancel")}
			className="max-w-200"
			confirmDisabled={holders === undefined}
			error={error}
			submitting={submitting}
			title={t(`${key}.title`, { name: role.name })}
			confirmLabel={
				count > 0 ? t(`${key}.confirm`, { count }) : t(`${key}.confirmNone`)
			}
			onClose={onClose}
			onConfirm={onConfirm}
		>
			{holders === undefined ? (
				!error && (
					<p className="text-sm text-neutral-700">
						{t("organisation.accessRoles.status.loading")}
					</p>
				)
			) : count === 0 ? (
				<p className="text-sm text-neutral-800">{t(`${key}.none`)}</p>
			) : (
				<div className="space-y-6">
					<p className="text-base font-semibold text-neutral-900">
						{t(`${key}.description`, { count })}
					</p>
					{affectsSelf && (
						<p className="text-sm font-semibold text-error-700">
							{t(`${key}.self`)}
						</p>
					)}
					<AccessRoleAssignments assignments={holders} />
					<PermissionSummary
						permissions={role.permissions.filter(isPermissionKey)}
						title={t(`${key}.allows`)}
					/>
					<p className="text-sm text-neutral-700">{t(`${key}.timing`)}</p>
				</div>
			)}
		</ConfirmDialog>
	);
};
