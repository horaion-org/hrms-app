import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { dayParameter, shownDayOf } from "@/common/dayView";
import type { FunctionComponent } from "@/common/types";
import type { Weekday } from "@/common/weekdays";
import { daysOf, mondayOf, openWeekOf } from "@/common/weeks";
import { Button } from "@/components/ui/Button";
import { DaySwitcher } from "@/components/ui/DaySwitcher";
import { FilterChips } from "@/components/ui/FilterChips";
import { FiltersPopover } from "@/components/ui/FiltersPopover";
import { PlusIcon } from "@/components/ui/Icon";
import { PageToolbar } from "@/components/ui/PageToolbar";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { WeekNavigator } from "@/components/ui/WeekNavigator";
import { isPartTime } from "@/features/availability/availabilityModel";
import { useMyAvailability } from "@/features/availability/useAvailability";
import { myProfileQuery } from "@/features/people/api";
import {
	ApplyForSomeoneDialog,
	withDepartmentNames,
} from "@/features/people/ApplyForSomeoneDialog";
import type { TeamMemberWeek } from "@/features/shiftPreferences/api";
import { MemberShiftPreferencesDialog } from "@/features/shiftPreferences/MemberShiftPreferencesDialog";
import { MyShiftPreferences } from "@/features/shiftPreferences/MyShiftPreferences";
import {
	isPastWeek,
	SHIFT_PREFERENCES_TEAM_UNIT_RULES,
	viewOf,
	viewsOf,
	weekOf,
	weekParameter,
	type ShiftPreferencesSearch,
} from "@/features/shiftPreferences/shiftPreferencesSearch";
import { TeamShiftPreferences } from "@/features/shiftPreferences/TeamShiftPreferences";
import {
	useWholeTeamPreferences,
	type WholeTeamState,
} from "@/features/shiftPreferences/useShiftPreferences";
import { workspaceQuery } from "@/features/workspace/api";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips } from "@/features/workspace/filterChips";
import {
	SHIFT_PREFERENCE_READ_KEYS,
	SHIFT_PREFERENCE_UPDATE_KEY,
} from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { recordScope } from "@/features/workspace/scopes";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import {
	offersDepartmentChoice,
	selectedUnits,
} from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/shift-preferences");

/**
 * The weekdays a part-timer has stated availability on in the week shown,
 * for the warning on the other days; undefined for anyone else, and while
 * it loads or if it fails, so nobody is warned on a guess.
 */
const useAvailableWeekdays = (
	companyId: string,
	weekStartMonday: string
): ReadonlyArray<Weekday> | undefined => {
	const profile = useQuery(myProfileQuery(companyId));
	const partTime = isPartTime(profile.data?.employmentType);
	const availability = useMyAvailability(companyId, weekStartMonday, partTime);
	if (!partTime || availability.status !== "ready") return undefined;
	return availability.week.map((window) => window.day);
};

/** The copy-key of why the team could not be listed to apply for, if it could not. */
const teamProblemKeyOf = (
	team: WholeTeamState
):
	| "shiftPreferences.team.hidden"
	| "shiftPreferences.team.failed"
	| undefined => {
	if (team.status === "hidden") return "shiftPreferences.team.hidden";
	if (team.status === "error") return "shiftPreferences.team.failed";
	return undefined;
};

/**
 * Shift preferences, in two tabs decided by data, never roles. "My
 * preferences" is everyone's own week of preferred shifts, changed with
 * nothing granted; a part-timer is warned of the days they have no
 * availability on. "Team" is the members of the header's Branch (every
 * Branch in reach under "All branches"), or of one Department of it, for one
 * week, read under `shift_preference:read`; a member's week is changed from
 * their row under `shift_preference:update`, or by "Apply shift
 * preferences", which chooses the member first, as Leave's "Apply leave"
 * does. Beneath the tabs, one toolbar holds the team's Department filter,
 * the week and that action. The tab (written once it is known), units and
 * week live in the URL; a week left out is this one, worked out on every
 * render. Any week can be read; only open days are changed. Page-level
 * composition only: the parts live in `features/shiftPreferences`.
 */
export const ShiftPreferences = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const access = useAccess();
	const views = viewsOf(access.canAny(SHIFT_PREFERENCE_READ_KEYS, "anywhere"));
	const view = viewOf(search.view, views);
	const today = new Date();
	const week = weekOf(search, today);
	// A phone shows a week one day at a time; the grid hides the others' columns.
	const todayDate = dayjs(today).format(ISO_DATE_FORMAT);
	const weekDates = daysOf(week);
	const shownDay = shownDayOf(weekDates, search.day, todayDate);
	// A week that has ended is shown, never changed: the API refuses it too.
	const past = isPastWeek(week, today);
	const availableWeekdays = useAvailableWeekdays(companyId, week);
	const workspace = useQuery({ ...workspaceQuery, retry });
	// Resolved as the header resolves them, so the list asks for the default Branch before the URL names one.
	const units = useUnitSelection(
		companyId,
		SHIFT_PREFERENCE_READ_KEYS,
		unitSelectionOf(search),
		SHIFT_PREFERENCES_TEAM_UNIT_RULES
	);
	const [editing, setEditing] = useState<TeamMemberWeek | null>(null);
	const [choosingMember, setChoosingMember] = useState(false);
	const canApply = access.canAnywhere(SHIFT_PREFERENCE_UPDATE_KEY);
	// A member's week opens in the first week still open: a row opens only in an open week, so there it is the
	// week shown; applying from a week that has ended opens this week.
	const openWeek = openWeekOf(week, today);
	const teamUnits = selectedUnits(units);
	const wholeTeam = useWholeTeamPreferences(
		companyId,
		{ ...teamUnits, weekStartMonday: openWeek },
		choosingMember
	);
	const teamProblemKey = teamProblemKeyOf(wholeTeam);

	const show = (next: ShiftPreferencesSearch): void => {
		void navigate({ search: (previous) => ({ ...previous, ...next }) });
	};
	// The URL names the tab shown, so the header knows whether this view lists by Branch.
	// Written once the tabs are known, so a first tab guessed while loading does not stick.
	// A workspace that fails to load leaves the person their own tab.
	const tabsKnown = access.status !== "pending";
	useEffect(() => {
		if (tabsKnown && view !== search.view)
			void navigate({
				search: (previous) => ({ ...previous, view }),
				replace: true,
			});
	}, [tabsKnown, view, search.view, navigate]);
	// A member is set for where they are filed; a removed member never.
	const maySetFor = (member: TeamMemberWeek): boolean =>
		member.displayName !== null &&
		access.can(SHIFT_PREFERENCE_UPDATE_KEY, recordScope(member.departmentId));
	// A row is changed only in a week still to come.
	const canEdit = (member: TeamMemberWeek): boolean =>
		!past && maySetFor(member);

	const header = (
		<div>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("shiftPreferences.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("shiftPreferences.pageSubtitle")}
			</p>
		</div>
	);
	if (!tabsKnown) return header;

	// Every tab's grid shows the week one day at a time on a phone; one tab is mounted at a time.
	const daySwitcher = shownDay && (
		<DaySwitcher
			className="mb-4"
			day={shownDay}
			days={weekDates}
			onDayChange={(day) => {
				show({ day: dayParameter(weekDates, day, todayDate) });
			}}
		/>
	);
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
	const applyAction = view === "team" &&
		canApply &&
		units.branches.length > 0 && (
			<Button
				leadingIcon={<PlusIcon />}
				onClick={() => {
					setChoosingMember(true);
				}}
			>
				{t("shiftPreferences.apply")}
			</Button>
		);
	return (
		<div>
			{header}
			{view === "team" &&
				workspace.data !== undefined &&
				units.branches.length === 0 && (
					<p className="mt-8 text-sm text-neutral-700">
						{t("shiftPreferences.noBranches")}
					</p>
				)}
			<Tabs
				className="mt-10"
				selectedIndex={views.indexOf(view)}
				onChange={(index) => {
					show({ view: views[index] });
				}}
			>
				<TabList aria-label={t("shiftPreferences.views")} className="-ml-1">
					{views.map((each) => (
						<Tab key={each}>{t(`shiftPreferences.${each}.tab`)}</Tab>
					))}
				</TabList>
				<PageToolbar
					actions={applyAction}
					className="mt-6 mb-8"
					label={t("shiftPreferences.controls")}
					chips={
						chips.length > 0 && (
							<FilterChips
								chips={chips}
								onClearAll={() => {
									show({ department: undefined });
								}}
							/>
						)
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
									show({
										week: weekParameter(monday, new Date()),
										day: undefined,
									});
								}}
							/>
						</>
					}
				/>
				<TabPanels>
					{views.map((each) => (
						<TabPanel key={each}>
							{daySwitcher}
							{each === "mine" ? (
								<MyShiftPreferences
									availableWeekdays={availableWeekdays}
									companyId={companyId}
									shownDay={shownDay}
									weekEnded={past}
									weekStartMonday={week}
								/>
							) : (
								units.branches.length > 0 && (
									<TeamShiftPreferences
										branchId={teamUnits.branchId}
										canEdit={canEdit}
										companyId={companyId}
										departmentId={teamUnits.departmentId}
										shownDay={shownDay}
										weekStartMonday={week}
										onEdit={setEditing}
									/>
								)
							)}
						</TabPanel>
					))}
				</TabPanels>
			</Tabs>
			{/* The team list names a member's Department by id only; the header's units name it. */}
			{choosingMember && (
				<ApplyForSomeoneDialog
					departmentId={units.department?.departmentId}
					maySetFor={maySetFor}
					problem={teamProblemKey && t(teamProblemKey)}
					title={t("shiftPreferences.apply")}
					people={
						wholeTeam.status === "ready"
							? withDepartmentNames(wholeTeam.members, units.departments)
							: undefined
					}
					onChoose={(member) => {
						setChoosingMember(false);
						setEditing(member);
					}}
					onClose={() => {
						setChoosingMember(false);
					}}
				/>
			)}
			{editing && (
				<MemberShiftPreferencesDialog
					key={editing.membershipId}
					companyId={companyId}
					membershipId={editing.membershipId}
					name={editing.displayName ?? t("scheduling.detail.formerMember")}
					weekStartMonday={openWeek}
					onClose={() => {
						setEditing(null);
					}}
				/>
			)}
		</div>
	);
};
