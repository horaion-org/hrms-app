import { Outlet, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, SidebarItem } from "@/components/layout/Sidebar";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
	DashboardFilledIcon,
	DashboardIcon,
	LeaveFilledIcon,
	LeaveIcon,
	OrganisationFilledIcon,
	OrganisationIcon,
	PeopleFilledIcon,
	PeopleIcon,
	SchedulingFilledIcon,
	SchedulingIcon,
	SettingsIcon,
} from "@/components/ui/Icon";
import { usableCompanies } from "@/features/auth/currentCompany";
import { logOut } from "@/features/auth/session";
import { ORGANISATION_READ_KEYS } from "@/features/workspace/permissionKeys";
import { useCanAnywhere } from "@/features/workspace/useCan";
import { CompanySelection } from "@/pages/CompanySelection";

export const MainLayout = (): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	const [switching, setSwitching] = useState(false);
	const { t } = useTranslation();
	const canAnywhere = useCanAnywhere();
	if (
		!("currentUser" in context) ||
		!context.currentUser ||
		context.currentCompany.kind !== "settled"
	)
		return null;
	if (switching)
		return (
			<CompanySelection
				forceChoose
				onChosen={() => {
					setSwitching(false);
				}}
			/>
		);
	const { displayName } = context.currentUser;
	return (
		<AppShell
			header={
				<AppHeader
					actions={
						<>
							<Button
								aria-label={t("shell.settings")}
								to="/settings"
								variant="icon"
							>
								<SettingsIcon />
							</Button>
							<Avatar name={displayName} />
						</>
					}
					title={
						<Trans
							i18nKey="shell.welcome"
							values={{ name: displayName }}
							components={{
								name: <span className="font-medium text-ink-blue-900" />,
							}}
						/>
					}
				/>
			}
			sidebar={
				<Sidebar
					className="min-h-0 w-full sm:min-h-dvh sm:w-70"
					footer={
						<div className="flex flex-col gap-3">
							{usableCompanies(context.currentUser).length > 1 && (
								<Button
									className="w-full"
									variant="secondary"
									onClick={() => {
										setSwitching(true);
									}}
								>
									{t("auth.company.switch")}
								</Button>
							)}
							<Button className="w-full" onClick={logOut}>
								{t("auth.logOut")}
							</Button>
						</div>
					}
				>
					<SidebarItem
						activeIcon={DashboardFilledIcon}
						activeOptions={{ exact: true }}
						icon={DashboardIcon}
						label={t("shell.navigation.dashboard")}
						to="/"
					/>
					<SidebarItem
						activeIcon={SchedulingFilledIcon}
						icon={SchedulingIcon}
						label={t("shell.navigation.scheduling")}
						to="/scheduling"
					/>
					<SidebarItem
						activeIcon={LeaveFilledIcon}
						icon={LeaveIcon}
						label={t("shell.navigation.leave")}
						to="/leave"
					/>
					<SidebarItem
						activeIcon={PeopleFilledIcon}
						icon={PeopleIcon}
						label={t("shell.navigation.people")}
						to="/people"
					/>
					{/* Offered only when the workspace grants something in it, at any scope. */}
					{canAnywhere(ORGANISATION_READ_KEYS) && (
						<SidebarItem
							activeIcon={OrganisationFilledIcon}
							icon={OrganisationIcon}
							label={t("shell.navigation.organisation")}
							to="/organisation"
						/>
					)}
				</Sidebar>
			}
		>
			<Outlet />
		</AppShell>
	);
};
