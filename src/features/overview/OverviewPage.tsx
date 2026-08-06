import { Link } from "@tanstack/react-router";
import { PERMISSION } from "@/common/permissions";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import { PermissionGate } from "@/features/permissions/PermissionGate";
import { useWorkspace } from "@/features/session/workspace-context";

const CARD = "rounded-lg bg-white p-5 ring-1 ring-slate-200";

export const OverviewPage = (): FunctionComponent => {
	const { me, membership, permissions } = useWorkspace();

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-xl font-semibold text-slate-900">
					Welcome, {me.display_name ?? me.email}
				</h1>
				<p className="text-sm text-slate-500">
					{membership.company_name} · {membership.subdomain}
				</p>
			</header>

			{membership.company_status === "PENDING_VERIFICATION" ? (
				<div className={CARD}>
					<p className="text-sm font-medium text-slate-900">
						Your company is still pending verification
					</p>
					<p className="mt-1 text-sm text-slate-500">
						Everything works normally. The status clears automatically once your
						email confirmation is picked up.
					</p>
				</div>
			) : null}

			<div className="grid gap-4 sm:grid-cols-2">
				<PermissionGate permission={PERMISSION.memberRead}>
					<Link className={CARD} to="/members">
						<p className="font-medium text-slate-900">Members</p>
						<p className="mt-1 text-sm text-slate-500">
							Invite people and manage who has access.
						</p>
					</Link>
				</PermissionGate>
				<PermissionGate permission={PERMISSION.roleRead}>
					<Link className={CARD} to="/roles">
						<p className="font-medium text-slate-900">Roles</p>
						<p className="mt-1 text-sm text-slate-500">
							Build roles from the permission catalog.
						</p>
					</Link>
				</PermissionGate>
			</div>

			<div className={CARD}>
				<p className="font-medium text-slate-900">Your access</p>
				<p className="mt-1 text-sm text-slate-500">
					{membership.owner
						? "As the owner you hold every permission in the catalog."
						: "These are the permissions you currently hold."}
				</p>
				<div className="mt-3 flex flex-wrap gap-1">
					{permissions.size === 0 ? (
						<span className="text-sm text-slate-400">
							No permissions yet. An administrator can grant you a role.
						</span>
					) : (
						[...permissions].sort().map((permission) => (
							<Badge key={permission} tone="muted">
								{permission}
							</Badge>
						))
					)}
				</div>
			</div>
		</section>
	);
};
