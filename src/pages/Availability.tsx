import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { FilterChips } from "@/components/ui/FilterChips";
import { FiltersPopover } from "@/components/ui/FiltersPopover";
import { PageToolbar } from "@/components/ui/PageToolbar";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { WeekNavigator } from "@/components/ui/WeekNavigator";
import type { MemberWeek } from "@/features/availability/api";
import { isPastWeek } from "@/features/availability/availabilityModel";
import {
	availabilityQueryOf,
	AVAILABILITY_TEAM_UNIT_RULES,
	viewOf,
	viewsOf,
	weekOf,
	weekParameter,
	type AvailabilitySearch,
} from "@/features/availability/availabilitySearch";
import { MemberAvailabilityDialog } from "@/features/availability/MemberAvailabilityDialog";
import { MyAvailability } from "@/features/availability/MyAvailability";
import { TeamAvailability } from "@/features/availability/TeamAvailability";
import {
	useAvailabilityViews,
	useAvailabilityList,
	type TeamAvailabilityList,
} from "@/features/availability/useAvailability";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { myProfileQuery } from "@/features/people/api";
import { mondayOf } from "@/features/scheduling/schedules";
import { workspaceQuery } from "@/features/workspace/api";
import {
	AVAILABILITY_READ_KEYS,
	AVAILABILITY_UPDATE_KEY,
} from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { recordScope } from "@/features/workspace/scopes";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips } from "@/features/workspace/filterChips";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import {
	offersDepartmentChoice,
	selectedUnits,
} from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/availability");

/** The copy a team list that is not ready is explained with, if any. */
const problemKeyOf = (
	list: TeamAvailabilityList
):
	| { key: "availability.hidden" | "availability.teamFailed"; alert: boolean }
	| undefined => {
	if (list.status === "hidden")
		return { key: "availability.hidden", alert: false };
	if (list.status === "error")
		return { key: "availability.teamFailed", alert: true };
	return undefined;
};

/**
 * Work availability, in two tabs decided by data, never roles. "Mine" is a
 * part-timer's own week and pattern, changed with nothing granted. "Team"
 * is the part-timers of the header's Branch (every Branch in reach under
 * "All branches") for one week, read through the person's grants, with
 * editing on the rows they may change. Beneath the tabs, one toolbar holds
 * the team's Department filter and the week. The tab (written once it is
 * known), units and week live in the URL; a week left out is this one,
 * worked out on every render. Any week can be read; only this week and
 * later ones are edited. Page-level composition only: the parts live in
 * `features/availability`.
 */
export const Availability = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const access = useAccess();
	const offered = useAvailabilityViews();
	const profile = useQuery(myProfileQuery(companyId));
	const views = viewsOf(offered);
	const view = viewOf(search.view, views);
	const today = new Date();
	const week = weekOf(search, today);
	// A week that has ended is shown, never changed: the API refuses it too.
	const past = isPastWeek(week, today);
	const workspace = useQuery({ ...workspaceQuery, retry });
	const requested = unitSelectionOf(search);
	// Resolved as the header resolves them, so the list asks for the default Branch before the URL names one.
	const units = useUnitSelection(
		companyId,
		AVAILABILITY_READ_KEYS,
		requested,
		AVAILABILITY_TEAM_UNIT_RULES
	);
	const team = useAvailabilityList(
		companyId,
		units.branches.length > 0
			? availabilityQueryOf(selectedUnits(units), week)
			: undefined,
		view === "team"
	);
	const [editing, setEditing] = useState<MemberWeek | null>(null);

	const show = (next: AvailabilitySearch): void => {
		void navigate({ search: (previous) => ({ ...previous, ...next }) });
	};
	// The URL names the tab shown, so the header knows whether this view lists by Branch.
	useEffect(() => {
		if (view && view !== search.view)
			void navigate({
				search: (previous) => ({ ...previous, view }),
				replace: true,
			});
	}, [view, search.view, navigate]);
	// A row is changed where its member is filed, and only in a week still to come.
	const canEdit = (member: MemberWeek): boolean =>
		!past &&
		access.can(AVAILABILITY_UPDATE_KEY, recordScope(member.departmentId));
	const editsAnywhere = access.canAnywhere(AVAILABILITY_UPDATE_KEY);

	const header = (
		<div>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("availability.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("availability.subtitle")}
			</p>
		</div>
	);
	if (offered.status === "pending") return header;
	if (!view)
		return (
			<div>
				{header}
				<p className="mt-8 text-sm text-neutral-700">
					{t("availability.unavailable")}
				</p>
			</div>
		);

	const teamProblem = problemKeyOf(team);
	// The Branch is the header's scope; the team's Department is the only filter.
	const chips =
		view === "team"
			? departmentChips(
					units,
					() => {
						show({ department: undefined });
					},
					t
				)
			: [];
	return (
		<div>
			{header}
			{view === "team" &&
				workspace.data !== undefined &&
				units.branches.length === 0 && (
					<p className="mt-8 text-sm text-neutral-700">
						{t("availability.noBranches")}
					</p>
				)}
			<Tabs
				className="mt-10"
				selectedIndex={views.indexOf(view)}
				onChange={(index) => {
					show({ view: views[index] });
				}}
			>
				<TabList aria-label={t("availability.views")} className="-ml-1">
					{views.map((each) => (
						<Tab key={each}>{t(`availability.${each}.tab`)}</Tab>
					))}
				</TabList>
				<PageToolbar
					className="mt-6 mb-8"
					label={t("availability.controls")}
					chips={
						<FilterChips
							chips={chips}
							onClearAll={() => {
								show({ department: undefined });
							}}
						/>
					}
					filters={
						<>
							{view === "team" && offersDepartmentChoice(units) && (
								<FiltersPopover count={chips.length}>
									<DepartmentFilter
										selection={units}
										onChange={(department) => {
											show({ department });
										}}
									/>
								</FiltersPopover>
							)}
							<WeekNavigator
								currentWeek={mondayOf(today)}
								week={week}
								onWeekChange={(monday) => {
									show({ week: weekParameter(monday, new Date()) });
								}}
							/>
						</>
					}
				/>
				<TabPanels>
					{views.map((each) => (
						<TabPanel key={each}>
							{each === "mine" ? (
								<MyAvailability
									companyId={companyId}
									editable={!past}
									name={profile.data?.displayName ?? ""}
									weekStartMonday={week}
								/>
							) : teamProblem ? (
								<p
									className="text-sm text-neutral-700 data-alert:text-error-700"
									data-alert={teamProblem.alert || undefined}
									role={teamProblem.alert ? "alert" : undefined}
								>
									{t(teamProblem.key)}
								</p>
							) : (
								<>
									{past && editsAnywhere && (
										<Callout className="mb-4">
											{t("availability.pastWeek")}
										</Callout>
									)}
									<TeamAvailability
										canEdit={canEdit}
										members={team.status === "ready" ? team.members : []}
										showDepartment={units.department === undefined}
										weekStartMonday={week}
										onEdit={setEditing}
									/>
								</>
							)}
						</TabPanel>
					))}
				</TabPanels>
			</Tabs>
			{editing && (
				<MemberAvailabilityDialog
					key={editing.membershipId}
					companyId={companyId}
					member={editing}
					weekStartMonday={week}
					onClose={() => {
						setEditing(null);
					}}
				/>
			)}
		</div>
	);
};
