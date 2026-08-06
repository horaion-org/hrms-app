import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PERMISSION } from "@/common/permissions";
import type { FunctionComponent } from "@/common/types";
import { useWorkspace } from "@/features/session/workspace-context";

type NavigationItem = {
	label: string;
	to: string;
	permission: string | null;
};

const NAVIGATION: Array<NavigationItem> = [
	{ label: "Overview", to: "/", permission: null },
	{ label: "Members", to: "/members", permission: PERMISSION.memberRead },
	{ label: "Roles", to: "/roles", permission: PERMISSION.roleRead },
];

const LINK =
	"rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100";

type AppShellProps = {
	children: ReactNode;
	onSignOut: () => void;
};

export const AppShell = ({
	children,
	onSignOut,
}: AppShellProps): FunctionComponent => {
	const { me, membership, permissions } = useWorkspace();
	const visible = NAVIGATION.filter(
		(item) => item.permission === null || permissions.has(item.permission)
	);

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b border-slate-200 bg-white">
				<div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-sm font-semibold text-slate-900">
							{membership.company_name}
						</span>
						<span className="truncate text-xs text-slate-500">
							{membership.subdomain}
						</span>
					</div>
					{membership.company_status === "PENDING_VERIFICATION" ? (
						<Badge tone="warning">Pending verification</Badge>
					) : null}
					<nav aria-label="Main" className="ml-4 flex flex-1 gap-1">
						{visible.map((item) => (
							<Link
								key={item.to}
								activeProps={{ className: "bg-slate-100 text-slate-900" }}
								className={LINK}
								to={item.to}
							>
								{item.label}
							</Link>
						))}
					</nav>
					<div className="flex items-center gap-3">
						<div className="hidden text-right sm:block">
							<p className="text-sm text-slate-900">
								{me.display_name ?? me.email}
							</p>
							{membership.owner ? <Badge tone="positive">Owner</Badge> : null}
						</div>
						<Button size="small" variant="secondary" onClick={onSignOut}>
							Sign out
						</Button>
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
		</div>
	);
};
