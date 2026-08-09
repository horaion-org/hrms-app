import { useState } from "react";
import type { Member } from "@/common/api";
import { PERMISSION } from "@/common/permissions";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
	DataTable,
	type DataTableColumns,
} from "@/components/ui/DataTable/DataTable";
import { LoadingState, PageState } from "@/components/ui/PageState";
import { PermissionGate } from "@/features/permissions/PermissionGate";
import { InviteMemberDialog } from "@/features/members/InviteMemberDialog";
import { ImportMembersDialog } from "@/features/members/ImportMembersDialog";
import { MemberRolesDialog } from "@/features/members/MemberRolesDialog";
import {
	useDeactivateMemberMutation,
	useMembersQuery,
	useReactivateMemberMutation,
} from "@/features/members/useMembersQuery";
import { useRolesQuery } from "@/features/roles/useRolesQuery";
import { useWorkspace } from "@/features/session/workspace-context";

export const MembersPage = (): FunctionComponent => {
	const { companyId } = useWorkspace();
	const membersQuery = useMembersQuery(companyId);
	const rolesQuery = useRolesQuery(companyId);
	const deactivate = useDeactivateMemberMutation(companyId);
	const reactivate = useReactivateMemberMutation(companyId);
	const [inviting, setInviting] = useState(false);
	const [importing, setImporting] = useState(false);
	const [editingRolesFor, setEditingRolesFor] = useState<Member | null>(null);

	const roleName = (roleId: string): string =>
		rolesQuery.data?.content.find((role) => role.id === roleId)?.name ??
		"Unknown role";

	const columns: DataTableColumns<Member> = [
		{
			header: "Member",
			id: "member",
			cell: ({ row }): FunctionComponent => (
				<div>
					<p className="font-medium">{row.original.display_name}</p>
					<p className="text-slate-500">{row.original.email}</p>
				</div>
			),
		},
		{
			header: "Status",
			id: "status",
			cell: ({ row }): FunctionComponent =>
				row.original.status === "ACTIVE" ? (
					<Badge tone="positive">Active</Badge>
				) : (
					<Badge tone="muted">Inactive</Badge>
				),
		},
		{
			header: "Roles",
			id: "roles",
			cell: ({ row }): FunctionComponent =>
				row.original.role_ids.length === 0 ? (
					<span className="text-slate-400">No roles</span>
				) : (
					<div className="flex flex-wrap gap-1">
						{row.original.role_ids.map((roleId) => (
							<Badge key={roleId}>{roleName(roleId)}</Badge>
						))}
					</div>
				),
		},
		{
			header: "",
			id: "actions",
			cell: ({ row }): FunctionComponent => (
				<div className="flex justify-end gap-2">
					<PermissionGate permission={PERMISSION.roleAssign}>
						<Button
							size="small"
							variant="secondary"
							onClick={() => {
								setEditingRolesFor(row.original);
							}}
						>
							Roles
						</Button>
					</PermissionGate>
					<PermissionGate permission={PERMISSION.memberDeactivate}>
						{row.original.status === "ACTIVE" ? (
							<Button
								loading={deactivate.isPending}
								size="small"
								variant="ghost"
								onClick={() => {
									deactivate.mutate(row.original.id);
								}}
							>
								Deactivate
							</Button>
						) : (
							<Button
								loading={reactivate.isPending}
								size="small"
								variant="ghost"
								onClick={() => {
									reactivate.mutate(row.original.id);
								}}
							>
								Reactivate
							</Button>
						)}
					</PermissionGate>
				</div>
			),
		},
	] as DataTableColumns<Member>;

	return (
		<section className="space-y-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold text-slate-900">Members</h1>
					<p className="text-sm text-slate-500">
						People who can sign in to this company.
					</p>
				</div>
				<PermissionGate permission={PERMISSION.memberCreate}>
					<div className="flex gap-2">
						<Button
							variant="secondary"
							onClick={() => {
								setImporting(true);
							}}
						>
							Import
						</Button>
						<Button
							onClick={() => {
								setInviting(true);
							}}
						>
							Invite member
						</Button>
					</div>
				</PermissionGate>
			</header>

			{membersQuery.isPending ? <LoadingState /> : null}

			{membersQuery.isError ? (
				<PageState
					description={membersQuery.error.message}
					title="We could not load members"
				/>
			) : null}

			{membersQuery.data === undefined ? null : (
				<DataTable
					caption="Company members"
					columns={columns}
					emptyMessage="No members yet. Invite someone to get started."
					rows={membersQuery.data.content}
				/>
			)}

			<InviteMemberDialog
				open={inviting}
				onClose={() => {
					setInviting(false);
				}}
			/>
			<ImportMembersDialog
				open={importing}
				onClose={() => {
					setImporting(false);
				}}
			/>
			<MemberRolesDialog
				member={editingRolesFor}
				onClose={() => {
					setEditingRolesFor(null);
				}}
			/>
		</section>
	);
};
