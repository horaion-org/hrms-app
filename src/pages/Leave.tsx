import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Refusal } from "@/common/refusal";
import { useDebouncedValue } from "@/common/useDebouncedValue";
import type { DateRange } from "@/components/forms/Calendar";
import { dayParameter, shownDayOf } from "@/common/dayView";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { DaySwitcher } from "@/components/ui/DaySwitcher";
import { PlusIcon } from "@/components/ui/Icon";
import { FilterChips } from "@/components/ui/FilterChips";
import { FiltersPopover } from "@/components/ui/FiltersPopover";
import { PageToolbar } from "@/components/ui/PageToolbar";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";
import { defaultRange, rangeDays } from "@/features/leave/dates";
import { LeaveRangeNavigator } from "@/features/leave/LeaveRangeNavigator";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { LinkedLeaveRequest } from "@/features/leave/LinkedLeaveRequest";
import { LeaveRequests } from "@/features/leave/LeaveRequests";
import { applyRefusal, type ApplyField } from "@/features/leave/leaveRefusal";
import {
	leaveQueryOf,
	myLeaveQueryOf,
	pageParameter,
	LEAVE_TEAM_UNIT_RULES,
	sortParameter,
	timelineQueryOf,
	type LeaveSearch,
} from "@/features/leave/leaveSearch";
import { LeaveStatusFilter } from "@/features/leave/LeaveStatusFilter";
import { LeaveTimeline } from "@/features/leave/LeaveTimeline";
import type { LeaveRequest, LeaveRequestBody } from "@/features/leave/types";
import { useLeaveApplyActions } from "@/features/leave/useLeaveActions";
import { useLeaveDecision } from "@/features/leave/useLeaveDecision";
import {
	useLeaveRequests,
	useMyLeaveRequests,
	usePendingLeaveCount,
	type LeaveList,
} from "@/features/leave/useLeaveRequests";
import { peopleQuery } from "@/features/people/api";
import { workspaceQuery } from "@/features/workspace/api";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { recordScope } from "@/features/workspace/scopes";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips, filterChip } from "@/features/workspace/filterChips";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import {
	offersDepartmentChoice,
	selectedUnits,
} from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/leave");

/** The open dialog: a request being read or decided, or an application. */
type LeaveDialogState = {
	request?: LeaveRequest;
	mode: "view" | "reject" | "approve" | "apply" | "applyOwn" | "record";
};

/** The three views, in tab order; the team views exist only with the read key held somewhere. */
type View = "mine" | "requests" | "timeline";

const VIEWS: ReadonlyArray<View> = ["mine", "requests", "timeline"];

/** The copy a list that is not ready is explained with, if any. */
const problemOf = (
	list: LeaveList,
	t: TFunction,
	own: boolean
): { message: string; alert: boolean } | undefined => {
	if (list.status === "hidden")
		return { message: t("leave.hidden"), alert: false };
	if (list.status === "error")
		return { message: t(own ? "leave.myFailed" : "leave.failed"), alert: true };
	return undefined;
};

/**
 * Leave, in three tabs. "My leave" is every member's own requests and their
 * own applications, with nothing to grant. "Team requests" and "Team
 * timeline" show the requests of the header's Branch (every Branch in
 * reach under "All branches"), optionally narrowed to one Department. Both
 * are read through the person's grants, with applying on behalf, approving
 * and rejecting for the people they may decide for. Beneath the tabs, one
 * toolbar holds the view's Filters, period and action. The view, units and
 * table state live in the URL; the timeline's window stays on the page.
 * Page-level composition only: the parts live in `features/leave`.
 */
export const Leave = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const ownMembershipId = useCurrentMembershipId();
	const access = useAccess();
	// "My leave" asks nothing of the workspace: it stays usable when the workspace is empty or failing.
	const canRead = access.canAny(LEAVE_READ_KEYS, "anywhere");
	const canApply = access.canAnywhere("leave_request:create");
	const canRecord = access.canAnywhere("leave_request:review");
	const view: View = canRead && search.view ? search.view : "mine";
	const team = view !== "mine";
	const workspace = useQuery({ ...workspaceQuery, retry });
	const requested = unitSelectionOf(search);
	// Resolved as the header resolves them, so the lists ask for the default Branch before the URL names one.
	const units = useUnitSelection(
		companyId,
		LEAVE_READ_KEYS,
		requested,
		LEAVE_TEAM_UNIT_RULES
	);
	const shownUnits = selectedUnits(units);
	const noBranches =
		workspace.data !== undefined && units.branches.length === 0;
	const pendingCount = usePendingLeaveCount(companyId);
	const [range, setRange] = useState<DateRange>(defaultRange);
	// A phone shows the timeline one day at a time; the timeline closes up the others' columns.
	const today = dayjs().format("YYYY-MM-DD");
	const timelineDays = rangeDays(range);
	const shownDay = shownDayOf(timelineDays, search.day, today);
	const mine = useMyLeaveRequests(
		companyId,
		myLeaveQueryOf(search),
		view === "mine"
	);
	const list = useLeaveRequests(
		companyId,
		units.branches.length > 0 ? leaveQueryOf(search, shownUnits) : undefined,
		view === "requests"
	);
	const timeline = useLeaveRequests(
		companyId,
		units.branches.length > 0 ? timelineQueryOf(shownUnits, range) : undefined,
		view === "timeline"
	);
	const applyActions = useLeaveApplyActions(companyId);
	const [dialog, setDialog] = useState<LeaveDialogState | null>(null);
	const [refusal, setRefusal] = useState<Refusal<ApplyField>>();
	const [message, setMessage] = useState("");
	// Each request is decided where its member is filed, or by its flow's open step; nobody decides their own.
	const decision = useLeaveDecision(companyId, {
		onDecided: (text) => {
			setDialog(null);
			setMessage(text);
		},
	});
	const [employeeSearch, setEmployeeSearch] = useState("");
	const settled = useDebouncedValue(employeeSearch.trim());
	const people = useQuery(
		peopleQuery(
			companyId,
			{
				page: 1,
				sort: { field: "displayName", desc: false },
				status: "ACTIVE",
				search: settled,
			},
			(canApply && dialog?.mode === "apply") ||
				(canRecord && dialog?.mode === "record")
		)
	);
	const applyFormOpen =
		dialog?.mode === "apply" ||
		dialog?.mode === "applyOwn" ||
		dialog?.mode === "record";
	// Anything that changes which requests are listed starts again from the first page.
	const show = (next: LeaveSearch): void => {
		void navigate({
			search: (previous) => ({ ...previous, page: undefined, ...next }),
		});
	};
	const close = (): void => {
		setDialog(null);
		setRefusal(undefined);
		decision.clearRefusal();
	};
	const done = (text: string): void => {
		close();
		setMessage(text);
	};
	const applying =
		applyActions.apply.isPending ||
		applyActions.applyOwn.isPending ||
		applyActions.record.isPending;
	const current =
		view === "mine" ? mine : view === "requests" ? list : timeline;
	const listProblem = problemOf(current, t, view === "mine");
	// The timeline has no status filter; My leave has no Department. The Branch is the header's scope.
	const showsStatus = view !== "timeline";
	const showsDepartment = team && offersDepartmentChoice(units);
	const chips = [
		...(team
			? departmentChips(
					units,
					() => {
						show({ department: undefined });
					},
					t
				)
			: []),
		...(showsStatus && search.status
			? [
					filterChip(
						"status",
						t("leave.showing"),
						t(`leave.statuses.${search.status}`),
						() => {
							show({ status: undefined });
						},
						t
					),
				]
			: []),
	];
	const clearFilters = (): void => {
		show({ status: undefined, department: undefined });
	};
	const applyAction =
		view === "mine" ? (
			<Button
				leadingIcon={<PlusIcon />}
				onClick={() => {
					setDialog({ mode: "applyOwn" });
				}}
			>
				{t("leave.applyOwn")}
			</Button>
		) : (
			!noBranches && (
				<>
					{canRecord && (
						<Button
							variant="secondary"
							onClick={() => {
								setDialog({ mode: "record" });
							}}
						>
							{t("leave.recordAction")}
						</Button>
					)}
					{canApply && (
						<Button
							leadingIcon={<PlusIcon />}
							onClick={() => {
								setDialog({ mode: "apply" });
							}}
						>
							{t("leave.apply")}
						</Button>
					)}
				</>
			)
		);
	// Who an application on someone's behalf may name: those the caller may apply, or record, for.
	const employees = {
		search: employeeSearch,
		onSearch: setEmployeeSearch,
		options: (people.data?.items ?? []).filter((person) =>
			access.can(
				dialog?.mode === "record"
					? "leave_request:review"
					: "leave_request:create",
				recordScope(person.departmentId)
			)
		),
	};
	const create = (
		membershipId: string | null,
		body: LeaveRequestBody
	): void => {
		const handlers = {
			onSuccess: (created: LeaveRequest): void => {
				done(
					membershipId === null
						? t("leave.appliedOwn")
						: t("leave.applied", { name: created.displayName })
				);
			},
			onError: (error: Error): void => {
				const next = applyRefusal(error, t);
				setRefusal(next);
				if (next.refreshMembers) void people.refetch();
			},
		};
		if (dialog?.mode === "record" && membershipId !== null) {
			applyActions.record.mutate(
				{
					membershipId,
					body: {
						leaveType: body.leaveType,
						startDate: body.startDate,
						endDate: body.endDate,
						remark: body.notes ?? "",
						takeOffRosteredDays: body.takeOffRosteredDays ?? false,
					},
				},
				{
					...handlers,
					onSuccess: (created) => {
						done(t("leave.recorded", { name: created.displayName }));
					},
				}
			);
		} else if (membershipId === null)
			applyActions.applyOwn.mutate(body, handlers);
		else applyActions.apply.mutate({ membershipId, body }, handlers);
	};
	const paging = (page: number): void => {
		void navigate({
			search: (previous) => ({ ...previous, page: pageParameter(page) }),
		});
	};
	return (
		<div>
			{search.requestId && (
				<LinkedLeaveRequest
					key={`${companyId}:${ownMembershipId}:${search.requestId}:${search.memberId ?? "me"}`}
					memberId={search.memberId}
					requestId={search.requestId}
					onClose={() => {
						void navigate({
							search: (previous) => ({
								...previous,
								requestId: undefined,
								memberId: undefined,
							}),
						});
					}}
				/>
			)}
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("leave.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">{t("leave.subtitle")}</p>
			{team && noBranches && (
				<p className="mt-8 text-sm text-neutral-700">{t("leave.noBranches")}</p>
			)}
			<Tabs
				className="mt-10"
				selectedIndex={VIEWS.indexOf(view)}
				onChange={(index) => {
					const next = VIEWS[index] ?? "mine";
					show({ view: next === "mine" ? undefined : next });
				}}
			>
				<TabList aria-label={t("leave.views")} className="-ml-1">
					<Tab>{t("leave.myLeave")}</Tab>
					{canRead && (
						<Tab
							count={pendingCount}
							countLabel={t("leave.pendingCount", { count: pendingCount })}
						>
							{t("leave.teamRequests")}
						</Tab>
					)}
					{canRead && <Tab>{t("leave.teamTimeline")}</Tab>}
				</TabList>
				<PageToolbar
					actions={applyAction}
					className="mt-6 mb-8"
					label={t("leave.controls")}
					chips={
						chips.length > 0 && (
							<FilterChips chips={chips} onClearAll={clearFilters} />
						)
					}
					filters={
						<>
							{(showsDepartment || showsStatus) && (
								<FiltersPopover count={chips.length}>
									{showsDepartment && (
										<DepartmentFilter
											selection={units}
											onChange={(department) => {
												show({ department });
											}}
										/>
									)}
									{showsStatus && (
										<LeaveStatusFilter
											status={search.status}
											onChange={(status) => {
												show({ status });
											}}
										/>
									)}
								</FiltersPopover>
							)}
							{view === "timeline" && (
								<LeaveRangeNavigator
									range={range}
									onRangeChange={(next) => {
										setRange(next);
										void navigate({
											search: (previous) => ({ ...previous, day: undefined }),
										});
									}}
								/>
							)}
						</>
					}
				/>
				{listProblem ? (
					<p
						className="text-sm text-neutral-700 data-alert:text-error-700"
						data-alert={listProblem.alert || undefined}
						role={listProblem.alert ? "alert" : undefined}
					>
						{listProblem.message}
					</p>
				) : (
					<TabPanels>
						<TabPanel>
							<LeaveRequests
								own
								canReview={() => false}
								emptyState={t("leave.myEmpty")}
								page={search.page ?? 1}
								rows={mine.status === "ready" ? mine.items : []}
								sort={myLeaveQueryOf(search).sort}
								total={mine.status === "ready" ? mine.total : 0}
								onPageChange={paging}
								onOpen={(request) => {
									setDialog({ request, mode: "view" });
								}}
								onSortChange={(sort) => {
									show({ sort: sortParameter(sort) });
								}}
							/>
						</TabPanel>
						{canRead && (
							<TabPanel>
								<LeaveRequests
									canReview={decision.canDecide}
									page={search.page ?? 1}
									rows={list.status === "ready" ? list.items : []}
									sort={leaveQueryOf(search).sort}
									total={list.status === "ready" ? list.total : 0}
									onPageChange={paging}
									onOpen={(request, decision) => {
										setDialog({ request, mode: decision ?? "view" });
									}}
									onSortChange={(sort) => {
										show({ sort: sortParameter(sort) });
									}}
								/>
							</TabPanel>
						)}
						{canRead && (
							<TabPanel>
								{shownDay && (
									<DaySwitcher
										className="mb-6"
										day={shownDay}
										days={timelineDays}
										onDayChange={(day) => {
											void navigate({
												search: (previous) => ({
													...previous,
													day: dayParameter(timelineDays, day, today),
												}),
											});
										}}
									/>
								)}
								<LeaveTimeline
									range={range}
									requests={timeline.status === "ready" ? timeline.items : []}
									shownDay={shownDay}
									onOpen={(request) => {
										setDialog({ request, mode: "view" });
									}}
								/>
							</TabPanel>
						)}
					</TabPanels>
				)}
			</Tabs>
			<p
				aria-live="polite"
				className="mt-4 text-sm text-success-800"
				role="status"
			>
				{message}
			</p>
			{dialog && (
				<LeaveRequestDialog
					key={`${dialog.request?.leaveRequestId ?? "new"}-${dialog.mode}`}
					mode={dialog.mode === "applyOwn" ? "apply" : dialog.mode}
					request={dialog.request}
					review={dialog.request && decision.reviewOf(dialog.request)}
					applyForm={
						applyFormOpen
							? {
									busy: applying,
									employees: dialog.mode === "applyOwn" ? undefined : employees,
									refusal,
									onCreate: create,
								}
							: undefined
					}
					lifecycle={{
						companyId,
						own: dialog.request?.membershipId === ownMembershipId,
						onDone: done,
					}}
					onClose={close}
				/>
			)}
		</div>
	);
};
