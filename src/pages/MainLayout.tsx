import {
	Outlet,
	useRouteContext,
	useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { Sidebar, SidebarItem } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import {
	ArrowRightIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	DashboardFilledIcon,
	DashboardIcon,
	FillShiftsIcon,
	LeaveFilledIcon,
	LeaveIcon,
	OrganisationFilledIcon,
	OrganisationIcon,
	PeopleFilledIcon,
	PeopleIcon,
	SchedulingFilledIcon,
	SchedulingIcon,
	SettingsIcon,
	SwapIcon,
	TableIcon,
	TimeIcon,
} from "@/components/ui/Icon";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { usableCompanies } from "@/features/auth/currentCompany";
import { logOut } from "@/features/auth/session";
import { useAvailabilityViews } from "@/features/availability/useAvailability";
import { SCHEDULING_KEYS } from "@/features/scheduling/schedulingSearch";
import {
	ORGANISATION_READ_KEYS,
	PEOPLE_READ_KEYS,
	SCHEDULE_READ_KEYS,
} from "@/features/workspace/permissionKeys";
import { Can } from "@/features/workspace/Can";
import { HeaderBranchScope } from "@/features/workspace/HeaderBranchScope";
import { useHeaderBranchScope } from "@/features/workspace/useHeaderBranchScope";
import { CompanySelection } from "@/pages/CompanySelection";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { useMenuCollapsed } from "@/pages/useMenuCollapsed";

const headerIconClasses =
	"h-12 w-12 [&>svg]:size-8 [&>svg]:text-ink-blue-900 hover:[&>svg]:text-ink-blue-700";

// From `lg` a collapsed rail's footer buttons shrink to a 48 px circle around their icon.
const collapsedFooterButtonClasses = "w-full lg:size-12 lg:px-0";

export const MainLayout = (): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	const [switching, setSwitching] = useState(false);
	const { t } = useTranslation();
	const { collapsed, toggleCollapsed } = useMenuCollapsed();
	// The control says what it will do: collapse an open menu, expand a collapsed one.
	const collapseLabel = collapsed
		? t("shell.expandMenu")
		: t("shell.collapseMenu");
	const availability = useAvailabilityViews();
	// The Branch the page lists, where it lists by Branch: the one scope shared by every list.
	const branchScope = useHeaderBranchScope();
	// The greeting belongs to the dashboard; other pages keep the header for their scope or nothing.
	const onHome = useRouterState({
		select: (state) => state.location.pathname === "/",
	});
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
							<NotificationBell />
							{/* Below `lg` Settings is in the Menu, leaving the bar room for the Branch. */}
							<Button
								aria-label={t("shell.settings")}
								className={`${headerIconClasses} max-lg:hidden`}
								to="/settings"
								variant="icon"
							>
								<SettingsIcon />
							</Button>
							<AccountMenu displayName={displayName} />
						</>
					}
					// The one Branch control, in the same place on every page that lists by Branch.
					scope={
						branchScope &&
						("fixed" in branchScope ? (
							<HeaderBranchScope fixed={branchScope.fixed} />
						) : (
							<HeaderBranchScope
								selection={branchScope.selection}
								onChange={branchScope.choose}
							/>
						))
					}
					title={
						onHome && (
							<Trans
								i18nKey="shell.welcome"
								values={{ name: displayName }}
								components={{
									name: <span className="font-medium text-ink-blue-900" />,
								}}
							/>
						)
					}
				/>
			}
			sidebar={
				<Sidebar
					collapsed={collapsed}
					menuLabel={t("shell.menu")}
					collapseToggle={
						<Button
							aria-expanded={!collapsed}
							aria-label={collapseLabel}
							className="size-10 [&>svg]:size-6 [&>svg]:text-white hover:[&>svg]:text-ink-blue-100"
							title={collapseLabel}
							variant="icon"
							onClick={toggleCollapsed}
						>
							{collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
						</Button>
					}
					footer={
						<div className="flex flex-col gap-3">
							{/* From `lg` Settings is the header's gear. */}
							<SidebarItem
								activeIcon={SettingsIcon}
								className="lg:hidden"
								icon={SettingsIcon}
								label={t("shell.settings")}
								to="/settings"
							/>
							{usableCompanies(context.currentUser).length > 1 && (
								<Button
									title={collapsed ? t("auth.company.switch") : undefined}
									variant="secondary"
									className={
										collapsed ? collapsedFooterButtonClasses : "w-full"
									}
									onClick={() => {
										setSwitching(true);
									}}
								>
									{collapsed && (
										<SwapIcon aria-hidden="true" className="max-lg:hidden" />
									)}
									<span className={collapsed ? "lg:sr-only" : undefined}>
										{t("auth.company.switch")}
									</span>
								</Button>
							)}
							<Button
								className={collapsed ? collapsedFooterButtonClasses : "w-full"}
								title={collapsed ? t("auth.logOut") : undefined}
								onClick={logOut}
							>
								{collapsed && (
									<ArrowRightIcon
										aria-hidden="true"
										className="max-lg:hidden"
									/>
								)}
								<span className={collapsed ? "lg:sr-only" : undefined}>
									{t("auth.logOut")}
								</span>
							</Button>
						</div>
					}
				>
					<SidebarItem
						activeIcon={DashboardFilledIcon}
						activeOptions={{ exact: true }}
						collapsed={collapsed}
						icon={DashboardIcon}
						label={t("shell.navigation.dashboard")}
						to="/"
					/>
					{/* Scheduling is offered where any of its tabs may be read (schedules, shifts), at any
					    scope. A member's own roster needs nothing granted: it opens from its notice, under /me. */}
					<Can anyOf={SCHEDULING_KEYS} at="anywhere">
						<SidebarItem
							activeIcon={SchedulingFilledIcon}
							collapsed={collapsed}
							icon={SchedulingIcon}
							label={t("shell.navigation.scheduling")}
							to="/scheduling"
						/>
					</Can>
					{/* Leave is for everyone: a member's own leave needs nothing granted. */}
					<SidebarItem
						activeIcon={LeaveFilledIcon}
						collapsed={collapsed}
						icon={LeaveIcon}
						label={t("shell.navigation.leave")}
						to="/leave"
					/>
					{/* Shift preferences are for everyone: a member's own need nothing granted. */}
					<SidebarItem
						activeIcon={FillShiftsIcon}
						collapsed={collapsed}
						icon={FillShiftsIcon}
						label={t("shell.navigation.shiftPreferences")}
						to="/shift-preferences"
					/>
					{/* Availability is offered to a part-timer, for their own, and to anyone who may read others'. */}
					{(availability.mine || availability.team) && (
						<SidebarItem
							activeIcon={TimeIcon}
							collapsed={collapsed}
							icon={TimeIcon}
							label={t("shell.navigation.availability")}
							to="/availability"
						/>
					)}
					{/* People and Organisation are offered only when the workspace grants something in them, at any scope. */}
					<Can anyOf={PEOPLE_READ_KEYS} at="anywhere">
						<SidebarItem
							activeIcon={PeopleFilledIcon}
							collapsed={collapsed}
							icon={PeopleIcon}
							label={t("shell.navigation.people")}
							to="/people"
						/>
					</Can>
					<Can anyOf={ORGANISATION_READ_KEYS} at="anywhere">
						<SidebarItem
							activeIcon={OrganisationFilledIcon}
							collapsed={collapsed}
							icon={OrganisationIcon}
							label={t("shell.navigation.organisation")}
							to="/organisation"
						/>
					</Can>
					{/* Reports reads rosters, so it is offered where they may be read, at any scope. It comes
					    last: a place to look back, not a daily task. */}
					<Can anyOf={SCHEDULE_READ_KEYS} at="anywhere">
						<SidebarItem
							activeIcon={TableIcon}
							collapsed={collapsed}
							icon={TableIcon}
							label={t("shell.navigation.reports")}
							to="/reports"
						/>
					</Can>
				</Sidebar>
			}
		>
			<Outlet />
		</AppShell>
	);
};
