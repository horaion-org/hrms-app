import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import {
	memberAvailabilityQuery,
	type MemberWeek,
} from "@/features/availability/api";
import type { AvailabilityScope } from "@/features/availability/availabilityModel";
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
import { WeekSelector } from "@/features/availability/WeekSelector";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { myProfileQuery } from "@/features/people/api";
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

type Editing = { member: MemberWeek; scope: AvailabilityScope };

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
 * render. Page-level composition only: the parts live in
 * `features/availability`.
 */
export const Availability = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const client = useQueryClient();
	const access = useAccess();
	const offered = useAvailabilityViews();
	const profile = useQuery(myProfileQuery(companyId));
	const views = viewsOf(offered);
	const view = viewOf(search.view, views);
	const today = new Date();
	const week = weekOf(search, today);
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
	const [editing, setEditing] = useState<Editing | null>(null);
	const [problem, setProblem] = useState("");

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
	// A row is changed where its member is filed.
	const canEdit = (member: MemberWeek): boolean =>
		access.can(AVAILABILITY_UPDATE_KEY, recordScope(member.departmentId));
	const edit = (member: MemberWeek, scope: AvailabilityScope): void => {
		setProblem("");
		if (scope.kind === "week") {
			setEditing({ member, scope });
			return;
		}
		// The pattern is read when asked for, so the editor opens on what is saved.
		client
			.ensureQueryData(memberAvailabilityQuery(companyId, member.membershipId))
			.then(
				() => {
					setEditing({ member, scope });
				},
				() => {
					setProblem(
						t("availability.patternFailed", { name: member.displayName })
					);
				}
			);
	};

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
					<WeekSelector
						className="ml-auto w-48 shrink-0 font-semibold"
						today={today}
						value={week}
						onChange={(monday) => {
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
								<TeamAvailability
									canEdit={canEdit}
									members={team.status === "ready" ? team.members : []}
									weekStartMonday={week}
									onEdit={edit}
								/>
							)}
						</TabPanel>
					))}
				</TabPanels>
			</Tabs>
			{problem && (
				<p className="mt-4 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
			{editing && (
				<MemberAvailabilityDialog
					key={`${editing.member.membershipId}-${editing.scope.kind}`}
					companyId={companyId}
					member={editing.member}
					scope={editing.scope}
					onClose={() => {
						setEditing(null);
					}}
				/>
			)}
		</div>
	);
};
