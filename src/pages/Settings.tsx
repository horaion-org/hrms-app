import { useRouteContext } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { GeneralSettingsForm } from "@/features/settings/GeneralSettingsForm";
import { useGeneralSettings } from "@/features/settings/useGeneralSettings";

const SECTIONS = ["general", "notifications", "scheduling"] as const;
const COMING_SOON_SECTIONS = ["notifications", "scheduling"] as const;

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

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("settings.title")}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">{t("settings.subtitle")}</p>
			<Tabs
				className="mt-10 flex flex-col overflow-hidden rounded-xl border border-neutral-400 sm:min-h-144 sm:flex-row"
				orientation="vertical"
			>
				<TabList
					aria-label={t("settings.sections")}
					className="sm:w-63 sm:shrink-0 sm:border-r sm:border-neutral-400"
				>
					{SECTIONS.map((section) => (
						<Tab
							key={section}
							description={t(`settings.${section}.description`)}
						>
							{t(`settings.${section}.title`)}
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
								className="mt-8 flex-1"
								defaultValues={general.values}
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
				</TabPanels>
			</Tabs>
		</>
	);
};
