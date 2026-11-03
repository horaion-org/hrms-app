import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { WeekNavigator } from "@/components/ui/WeekNavigator";
import type { MemberWeek } from "@/features/availability/api";
import { isPastWeek } from "@/features/availability/availabilityModel";
import {
	availabilityQueryOf,
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
import { BranchSelector } from "@/features/workspace/BranchSelector";
import { DepartmentSelector } from "@/features/workspace/DepartmentSelector";
import {
	AVAILABILITY_READ_KEYS,
	AVAILABILITY_UPDATE_KEY,
} from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { recordScope } from "@/features/workspace/scopes";
import { branchChoices, chosenBranch } from "@/features/workspace/unitChoices";
import { useAccess } from "@/features/workspace/useAccess";

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
 * is a Branch's part-timers for one week, read through the person's grants,
 * with editing on the rows they may change. The tab, Branch, Department and
 * week live in the URL; a week left out is this one, worked out on every
 * render. Any week can be read; only this week and later ones are edited. Page-level composition only: the parts live in
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
	const branches = workspace.data
		? branchChoices(workspace.data, companyId, AVAILABILITY_READ_KEYS)
		: undefined;
	// The same Branch the selector shows, so the list asks for it before the URL names it.
	const selected = chosenBranch(branches ?? [], search.branch);
	const team = useAvailabilityList(
		companyId,
		selected && availabilityQueryOf(search, selected.branchId, week),
		view === "team"
	);
	const [editing, setEditing] = useState<MemberWeek | null>(null);

	const show = (next: AvailabilitySearch): void => {
		void navigate({ search: (previous) => ({ ...previous, ...next }) });
	};
	const chooseBranch = (branch: string | undefined): void => {
		// The selector naming the Branch already shown keeps the history entry and its state.
		if (branch === selected?.branchId)
			void navigate({
				search: (previous) => ({ ...previous, branch }),
				replace: true,
				state: true,
			});
		else show({ branch, department: undefined });
	};
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
	return (
		<div>
			<div className="flex flex-wrap items-start justify-between gap-6">
				{header}
				{view === "team" && (
					<div className="flex flex-wrap items-center gap-5 pt-1">
						<BranchSelector
							companyId={companyId}
							keys={AVAILABILITY_READ_KEYS}
							value={search.branch}
							onChange={chooseBranch}
						/>
						{selected && (
							<DepartmentSelector
								aria-label={t("availability.department")}
								branchId={selected.branchId}
								className="w-52 font-semibold text-ink-blue-900"
								companyId={companyId}
								emptyLabel={t("availability.allDepartments")}
								keys={AVAILABILITY_READ_KEYS}
								placeholder={t("availability.allDepartments")}
								value={search.department ?? ""}
								onChange={(department) => {
									show({ department: department || undefined });
								}}
							/>
						)}
					</div>
				)}
			</div>
			{view === "team" && branches?.length === 0 && (
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
				<div className="mb-10 flex min-h-14 flex-wrap items-center justify-between gap-4">
					<TabList aria-label={t("availability.views")} className="-ml-1">
						{views.map((each) => (
							<Tab key={each}>{t(`availability.${each}.tab`)}</Tab>
						))}
					</TabList>
					<WeekNavigator
						className="ml-auto"
						currentWeek={mondayOf(today)}
						week={week}
						onWeekChange={(monday) => {
							show({ week: weekParameter(monday, new Date()) });
						}}
					/>
				</div>
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
										showDepartment={!search.department}
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
