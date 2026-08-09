import type { Member } from "@/common/api";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { LoadingState } from "@/components/ui/PageState";
import {
	useGrantRoleMutation,
	useRevokeRoleMutation,
} from "@/features/members/useMembersQuery";
import { useRolesQuery } from "@/features/roles/useRolesQuery";
import { useWorkspace } from "@/features/session/workspace-context";

type MemberRolesDialogProps = {
	member: Member | null;
	onClose: () => void;
};

/**
 * Grants and revokes Company-scoped Roles. The API applies the Permission
 * Subset Rule on grant, so a caller cannot hand over authority they lack; a
 * refusal here is a legitimate answer, not a bug.
 */
export const MemberRolesDialog = ({
	member,
	onClose,
}: MemberRolesDialogProps): FunctionComponent => {
	const { companyId } = useWorkspace();
	const rolesQuery = useRolesQuery(companyId);
	const grant = useGrantRoleMutation(companyId);
	const revoke = useRevokeRoleMutation(companyId);
	const held = new Set(member?.role_ids ?? []);
	const assignable = (rolesQuery.data?.content ?? []).filter(
		(role) => !role.protected_role
	);

	return (
		<Dialog
			description={member === null ? undefined : member.email}
			open={member !== null}
			title="Roles"
			onClose={onClose}
		>
			{rolesQuery.isPending ? <LoadingState /> : null}

			{assignable.length === 0 && !rolesQuery.isPending ? (
				<p className="text-sm text-slate-500">
					No roles exist yet. Create one before assigning access.
				</p>
			) : null}

			<ul className="divide-y divide-slate-100">
				{assignable.map((role) => (
					<li
						key={role.id}
						className="flex items-center justify-between gap-4 py-3"
					>
						<div className="min-w-0">
							<p className="text-sm font-medium text-slate-900">{role.name}</p>
							<p className="truncate text-xs text-slate-500">
								{role.permissions.join(", ")}
							</p>
						</div>
						{held.has(role.id) ? (
							<Button
								size="small"
								variant="ghost"
								onClick={() => {
									if (member !== null) {
										revoke.mutate({ memberId: member.id, roleId: role.id });
									}
								}}
							>
								Revoke
							</Button>
						) : (
							<Button
								size="small"
								variant="secondary"
								onClick={() => {
									if (member !== null) {
										grant.mutate({ memberId: member.id, roleId: role.id });
									}
								}}
							>
								Grant
							</Button>
						)}
					</li>
				))}
			</ul>

			<div className="mt-4 flex justify-end">
				<Button variant="secondary" onClick={onClose}>
					Done
				</Button>
			</div>
		</Dialog>
	);
};
