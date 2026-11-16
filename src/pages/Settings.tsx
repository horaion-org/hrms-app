import { getRouteApi, useRouteContext } from "@tanstack/react-router";
import { useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, ArrowUpIcon } from "@/components/ui/Icon";
import { ApprovalsSettings } from "@/features/settings/ApprovalsSettings";
import { dataItemsFor } from "@/features/settings/dataAccess";
import { DataSettings } from "@/features/settings/DataSettings";
import { EmploymentTermsSettings } from "@/features/settings/EmploymentTermsSettings";
import { GeneralSettingsForm } from "@/features/settings/GeneralSettingsForm";
import { LeaveDurationsSettings } from "@/features/settings/LeaveDurationsSettings";
import { LeaveTypesSettings } from "@/features/settings/LeaveTypesSettings";
import { PlanSettings } from "@/features/settings/PlanSettings";
import { SchedulingPolicySettings } from "@/features/settings/SchedulingPolicySettings";
import { SettingsNav } from "@/features/settings/SettingsNav";
import { useGeneralSettings } from "@/features/settings/useGeneralSettings";
import {
	selectedSection,
	visibleGroups,
	type SettingsSection,
} from "@/features/settings/sections";
import {
	offeredSections,
	sectionForAccess,
} from "@/features/settings/settingsAccess";
import { useRenameWorkspace } from "@/features/settings/useRenameWorkspace";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

const route = getRouteApi("/_authenticated/_app/settings");

/**
 * Settings: the grouped list of sections beside the one shown. On a phone
 * the list is the page until a section is chosen, which then shows alone
 * with a link back to the list.
 */
export const Settings = (): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	// The parent layout renders only once a company is settled.
	const companyId =
		"currentCompany" in context && context.currentCompany.kind === "settled"
			? context.currentCompany.company.companyId
			: "";
	const { t } = useTranslation();
	const general = useGeneralSettings(companyId);
	const access = useAccess();
	const renameWorkspace = useRenameWorkspace(companyId);
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const dataItems = dataItemsFor(access);
	// The section lives in the URL, so a link such as `?section=data` opens it.
	const asked = sectionForAccess(access, search.section);
	const groups = visibleGroups(offeredSections(access, { section: asked }));
	const selected = selectedSection(groups, asked);
	// With no section in the address, a phone shows the list and `md` up shows General.
	const listOnPhone = search.section === undefined;
	const panelRef = useRef<HTMLElement>(null);
	const approvalsProps = {
		canManage: access.can("approval_flow:manage", COMPANY_SCOPE),
		canRead: access.can("approval_flow:read", COMPANY_SCOPE),
		companyId,
	};

	/** A section's heading and its one-line description, for the panels drawn here. */
	const headingOf = (section: SettingsSection): ReactNode => (
		<>
			<h2 className="text-xl font-semibold text-neutral-900">
				{t(`settings.entries.${section}.title`)}
			</h2>
			<p className="mt-3 text-sm text-neutral-800">
				{t(`settings.entries.${section}.description`)}
			</p>
		</>
	);

	/** The panel of one section. */
	const panelOf = (section: SettingsSection): ReactNode => {
		switch (section) {
			case "general":
				return (
					<div className="flex flex-1 flex-col">
						{headingOf(section)}
						{general.status === "error" && (
							<p className="mt-8 text-sm text-error-700" role="alert">
								{t("settings.general.failed")}
							</p>
						)}
						{general.status === "ready" && (
							<GeneralSettingsForm
								canRename={access.can("company:update", COMPANY_SCOPE)}
								className="mt-8 flex-1"
								defaultValues={general.values}
								onSave={renameWorkspace.mutateAsync}
							/>
						)}
					</div>
				);
			case "notifications":
				return (
					<>
						{headingOf(section)}
						<p className="mt-8 text-sm text-neutral-700">
							{t("settings.comingSoon")}
						</p>
					</>
				);
			case "employment":
				return (
					<EmploymentTermsSettings
						companyId={companyId}
						openTermsId={search.terms}
						onTermsClosed={() => {
							void navigate({ search: { section: "employment" }, replace: true });
						}}
					/>
				);
			case "scheduling":
				return <SchedulingPolicySettings companyId={companyId} />;
			case "roster-approvals":
				return (
					<ApprovalsSettings {...approvalsProps} subject="SCHEDULE_PUBLICATION" />
				);
			case "leave-types":
				return <LeaveTypesSettings companyId={companyId} />;
			case "leave-durations":
				return <LeaveDurationsSettings companyId={companyId} />;
			case "leave-approvals":
				return <ApprovalsSettings {...approvalsProps} subject="LEAVE_REQUEST" />;
			case "data":
				return <DataSettings companyId={companyId} items={dataItems} />;
			case "plan":
				return <PlanSettings />;
			case "access":
				// The list links Access roles to their own page, and the route sends `?section=access` there.
				return null;
		}
	};

	return (
		<>
			<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-4xl font-medium text-neutral-900">
						{t("settings.title")}
					</h1>
					<p className="mt-3 text-sm text-neutral-800">
						{t("settings.subtitle")}
					</p>
				</div>
				<Button
					className="self-start sm:self-auto"
					leadingIcon={<ArrowUpIcon />}
					onClick={() => {
						void navigate({ search: { section: "plan" } }).then(() => {
							panelRef.current?.focus();
						});
					}}
				>
					{t("settings.upgrade.action")}
				</Button>
			</div>
			<div className="mt-10 flex flex-col overflow-hidden rounded-xl border border-neutral-400 md:min-h-144 md:flex-row">
				<SettingsNav
					groups={groups}
					listIsPage={listOnPhone}
					selected={selected}
					// Only as wide as its longest entry, so the panels keep the width.
					className={joinClassNames(
						"md:w-52 md:shrink-0 md:border-r md:border-neutral-400",
						!listOnPhone && "max-md:hidden"
					)}
				/>
				{!listOnPhone && (
					<Button
						// The list's own address; exact, so the link is never marked as the current page.
						activeOptions={{ exact: true, includeSearch: true }}
						className="mx-6 mt-6 self-start md:hidden"
						leadingIcon={<ArrowLeftIcon />}
						to="/settings"
						variant="textlink"
					>
						{t("settings.back")}
					</Button>
				)}
				<section
					ref={panelRef}
					aria-label={t(`settings.entries.${selected}.title`)}
					tabIndex={-1}
					className={joinClassNames(
						"flex min-w-0 flex-1 flex-col p-6 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-blue-500",
						listOnPhone && "max-md:hidden"
					)}
				>
					{panelOf(selected)}
				</section>
			</div>
		</>
	);
};
