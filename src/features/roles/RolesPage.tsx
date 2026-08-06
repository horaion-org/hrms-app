import { useState } from "react";
import type { Role } from "@/common/api";
import { PERMISSION } from "@/common/permissions";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState, PageState } from "@/components/ui/PageState";
import { PermissionGate } from "@/features/permissions/PermissionGate";
import { RoleFormDialog } from "@/features/roles/RoleFormDialog";
import {
	useDeleteRoleMutation,
	useRolesQuery,
} from "@/features/roles/useRolesQuery";
import { useWorkspace } from "@/features/session/workspace-context";

export const RolesPage = (): FunctionComponent => {
	const { companyId } = useWorkspace();
	const rolesQuery = useRolesQuery(companyId);
	const remove = useDeleteRoleMutation(companyId);
	const [editing, setEditing] = useState<Role | null>(null);
	const [creating, setCreating] = useState(false);

	return (
		<section className="space-y-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold text-slate-900">Roles</h1>
					<p className="text-sm text-slate-500">
						You can only build a role from permissions you hold yourself.
					</p>
				</div>
				<PermissionGate permission={PERMISSION.roleCreate}>
					<Button
						onClick={() => {
							setCreating(true);
						}}
					>
						New role
					</Button>
				</PermissionGate>
			</header>

			{rolesQuery.isPending ? <LoadingState /> : null}

			{rolesQuery.isError ? (
				<PageState
					description={rolesQuery.error.message}
					title="We could not load roles"
				/>
			) : null}

			{rolesQuery.data !== undefined && rolesQuery.data.length === 0 ? (
				<PageState
					description="Create a role to start granting access to members."
					title="No roles yet"
				/>
			) : null}

			<ul className="grid gap-3 sm:grid-cols-2">
				{(rolesQuery.data ?? []).map((role) => (
					<li
						key={role.id}
						className="rounded-lg bg-white p-4 ring-1 ring-slate-200"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="flex items-center gap-2 font-medium text-slate-900">
									{role.name}
									{role.protected_role ? <Badge>Protected</Badge> : null}
								</p>
								<p className="mt-1 text-xs text-slate-500">
									{role.permissions.length} permissions
								</p>
							</div>
							{role.protected_role ? null : (
								<div className="flex shrink-0 gap-1">
									<PermissionGate permission={PERMISSION.roleUpdate}>
										<Button
											size="small"
											variant="secondary"
											onClick={() => {
												setEditing(role);
											}}
										>
											Edit
										</Button>
									</PermissionGate>
									<PermissionGate permission={PERMISSION.roleDelete}>
										<Button
											size="small"
											variant="ghost"
											onClick={() => {
												remove.mutate(role.id);
											}}
										>
											Delete
										</Button>
									</PermissionGate>
								</div>
							)}
						</div>
						<div className="mt-3 flex flex-wrap gap-1">
							{role.permissions.slice(0, 6).map((permission) => (
								<Badge key={permission} tone="muted">
									{permission}
								</Badge>
							))}
						</div>
					</li>
				))}
			</ul>

			{creating || editing !== null ? (
				<RoleFormDialog
					key={editing?.id ?? "new"}
					role={editing}
					onClose={() => {
						setCreating(false);
						setEditing(null);
					}}
				/>
			) : null}
		</section>
	);
};
