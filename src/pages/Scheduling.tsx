import { getRouteApi } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { ConstraintsTab } from "@/features/scheduling/constraints/ConstraintsTab";
import { SchedulesTab } from "@/features/scheduling/SchedulesTab";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { returnLinkOf } from "@/features/scheduling/readiness/readinessCopy";
import {
	SCHEDULING_VIEW_KEYS,
	schedulingViewOf,
	schedulingViewsOf,
	type SchedulingView,
} from "@/features/scheduling/schedulingSearch";
import { ShiftsTab } from "@/features/scheduling/shifts/ShiftsTab";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const key = "scheduling.overview";

const route = getRouteApi("/_authenticated/_app/scheduling");

/**
 * Scheduling: a tab per view the person may read (Schedules, Shifts,
 * Constraints), each listing in the header's Branch, narrowed to a
 * Department from the Filters; the tab, Branch and Department are kept in
 * the URL.
 */
export const Scheduling = (): FunctionComponent => {
	const { t } = useTranslation();
	const companyId = useCurrentCompanyId();
	const navigate = route.useNavigate();
	const search = route.useSearch();
	const access = useAccess();
	const views = schedulingViewsOf((keys) =>
		keys.some((permission) => access.canAnywhere(permission))
	);
	const view = schedulingViewOf(search.view, views);
	const units = useUnitSelection(
		companyId,
		SCHEDULING_VIEW_KEYS[view ?? "schedules"],
		unitSelectionOf(search),
		SCHEDULING_UNIT_RULES
	);
	const chooseDepartment = (department: string | undefined): void => {
		void navigate({ search: (previous) => ({ ...previous, department }) });
	};
	const chooseView = (next: SchedulingView | undefined): void => {
		void navigate({
			search: (previous) => ({
				...previous,
				view: next === "schedules" ? undefined : next,
			}),
		});
	};
	// The URL names the tab shown, so the header offers the Branches of that tab's read keys.
	useEffect(() => {
		if (view && view !== (search.view ?? "schedules"))
			void navigate({
				search: (previous) => ({
					...previous,
					view: view === "schedules" ? undefined : view,
				}),
				replace: true,
			});
	}, [view, search.view, navigate]);
	const tab = {
		companyId,
		units,
		onDepartmentChange: chooseDepartment,
	};
	// Set while the wizard waits for a department to be set up here.
	const returnTo = returnLinkOf(search);
	const panels: Record<SchedulingView, ReactNode> = {
		schedules: <SchedulesTab {...tab} />,
		shifts: <ShiftsTab {...tab} returnTo={returnTo} />,
		constraints: <ConstraintsTab {...tab} returnTo={returnTo} />,
	};

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t(`${key}.title`)}
			</h1>
			<p className="mt-3 text-sm text-neutral-800">{t(`${key}.subtitle`)}</p>
			{view === undefined ? (
				// No tab to show: the schedule list explains that nothing may be read.
				panels.schedules
			) : (
				<Tabs
					className="mt-10"
					selectedIndex={views.indexOf(view)}
					onChange={(index) => {
						chooseView(views[index]);
					}}
				>
					<TabList aria-label={t("scheduling.views.label")} className="-ml-1">
						{views.map((each) => (
							<Tab key={each}>{t(`scheduling.views.${each}`)}</Tab>
						))}
					</TabList>
					<TabPanels>
						{views.map((each) => (
							<TabPanel key={each}>{panels[each]}</TabPanel>
						))}
					</TabPanels>
				</Tabs>
			)}
		</>
	);
};
