import { getRouteApi, useRouteContext } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { ArrowUpIcon } from "@/components/ui/Icon";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { subjectOfSlug } from "@/features/approvals/approvalSubjects";
import { ApprovalsSettings } from "@/features/settings/ApprovalsSettings";
import { dataItemsFor } from "@/features/settings/dataAccess";
import { DataSettings } from "@/features/settings/DataSettings";
import { EmploymentTermsSettings } from "@/features/settings/EmploymentTermsSettings";
import { GeneralSettingsForm } from "@/features/settings/GeneralSettingsForm";
import { LeaveTypesSettings } from "@/features/settings/LeaveTypesSettings";
import { PlanSettings } from "@/features/settings/PlanSettings";
import { SchedulingPolicySettings } from "@/features/settings/SchedulingPolicySettings";
import { useGeneralSettings } from "@/features/settings/useGeneralSettings";
import {
	searchForSection,
	selectedSectionIndex,
	visibleSections,
	type SettingsSection,
} from "@/features/settings/sections";
import { offeredSections } from "@/features/settings/settingsAccess";
import { useRenameWorkspace } from "@/features/settings/useRenameWorkspace";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

const route = getRouteApi("/_authenticated/_app/settings");

const COMING_SOON_SECTIONS = ["notifications"] as const;

const panelClasses =
	"p-6 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink-blue-500";

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
	const sections = visibleSections(offeredSections(access, search));
	const selectedIndex = selectedSectionIndex(sections, search.section);
	const planTabRef = useRef<HTMLButtonElement>(null);
	const show = (next: SettingsSection): void => {
		void navigate({ search: searchForSection(next), replace: true });
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
						show("plan");
						planTabRef.current?.focus();
					}}
				>
					{t("settings.upgrade.action")}
				</Button>
			</div>
			<Tabs
				// On a phone the sections are one scrolling row of tabs above the section; from `md` a column beside it.
				className="mt-10 flex flex-col overflow-hidden rounded-xl border border-neutral-400 md:min-h-144 md:flex-row"
				orientation="verticalFromMd"
				selectedIndex={selectedIndex}
				onChange={(index) => {
					show(sections[index] ?? "general");
				}}
			>
				<TabList
					aria-label={t("settings.sections")}
					className="max-md:border-b max-md:border-neutral-400 max-md:px-4 md:w-63 md:shrink-0 md:border-r md:border-neutral-400"
				>
					{sections.map((shown) => (
						<Tab
							key={shown}
							ref={shown === "plan" ? planTabRef : undefined}
							description={t(`settings.${shown}.description`)}
						>
							{t(`settings.${shown}.title`)}
						</Tab>
					))}
				</TabList>
				<TabPanels className="flex min-w-0 flex-1 flex-col">
					<TabPanel className={`flex flex-1 flex-col ${panelClasses}`}>
						<h2 className="text-xl font-semibold text-neutral-900">
							{t("settings.general.title")}
						</h2>
						<p className="mt-3 text-sm text-neutral-800">
							{t("settings.general.subtitle")}
						</p>
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
					</TabPanel>
					{COMING_SOON_SECTIONS.map((section) => (
						<TabPanel key={section} className={panelClasses}>
							<h2 className="text-xl font-semibold text-neutral-900">
								{t(`settings.${section}.title`)}
							</h2>
							<p className="mt-3 text-sm text-neutral-800">
								{t(`settings.${section}.description`)}
							</p>
							<p className="mt-8 text-sm text-neutral-700">
								{t("settings.comingSoon")}
							</p>
						</TabPanel>
					))}
					{sections.includes("employment") && (
						<TabPanel className={panelClasses}>
							<EmploymentTermsSettings
								companyId={companyId}
								openTermsId={search.terms}
								onTermsClosed={() => {
									show("employment");
								}}
							/>
						</TabPanel>
					)}
					{sections.includes("scheduling") && (
						<TabPanel className={panelClasses}>
							<SchedulingPolicySettings companyId={companyId} />
						</TabPanel>
					)}
					{sections.includes("leave") && (
						<TabPanel className={panelClasses}>
							<LeaveTypesSettings companyId={companyId} />
						</TabPanel>
					)}
					{sections.includes("approvals") && (
						<TabPanel className={panelClasses}>
							<ApprovalsSettings
								canManage={access.can("approval_flow:manage", COMPANY_SCOPE)}
								canRead={access.can("approval_flow:read", COMPANY_SCOPE)}
								companyId={companyId}
								subject={subjectOfSlug(search.subject)}
							/>
						</TabPanel>
					)}
					{sections.includes("access") && (
						<TabPanel className={panelClasses}>
							<h2 className="text-xl font-semibold text-neutral-900">
								{t("settings.access.title")}
							</h2>
							<p className="mt-3 text-sm text-neutral-800">
								{t("settings.access.description")}
							</p>
							<p className="mt-3 text-sm text-neutral-800">
								{t("organisation.accessRoles.baseline")}
							</p>
							<Button className="mt-6" to="/settings/access-roles">
								{t("settings.access.open")}
							</Button>
						</TabPanel>
					)}
					<TabPanel className={panelClasses}>
						<PlanSettings />
					</TabPanel>
					{sections.includes("data") && (
						<TabPanel className={panelClasses}>
							<DataSettings companyId={companyId} items={dataItems} />
						</TabPanel>
					)}
				</TabPanels>
			</Tabs>
		</>
	);
};
