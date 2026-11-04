import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DateRange } from "@/components/forms/Calendar";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { FilterChips } from "@/components/ui/FilterChips";
import { FiltersPopover } from "@/components/ui/FiltersPopover";
import { PageToolbar } from "@/components/ui/PageToolbar";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";
import { activeLeaveTypesQuery } from "@/features/leave/api";
import { defaultRange } from "@/features/leave/dates";
import { LeaveRangeNavigator } from "@/features/leave/LeaveRangeNavigator";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { LinkedLeaveRequest } from "@/features/leave/LinkedLeaveRequest";
import { LeaveRequests } from "@/features/leave/LeaveRequests";
import {
	applyRefusal,
	decisionRefusal,
	type ApplyField,
	type DecisionField,
} from "@/features/leave/leaveRefusal";
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
import type { LeaveRequest } from "@/features/leave/types";
import {
	useLeaveActions,
	useLeaveRequests,
	useMyLeaveRequests,
	usePendingLeaveCount,
	type LeaveList,
} from "@/features/leave/useLeaveRequests";
import type { Refusal } from "@/features/organisation/refusal";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";
import { peopleQuery } from "@/features/people/api";
import { useSettledSearch } from "@/features/people/usePeople";
import { workspaceQuery } from "@/features/workspace/api";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { recordScope } from "@/features/workspace/scopes";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips, filterChip } from "@/features/workspace/filterChips";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { selectedUnits } from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/leave");

type Dialog = {
	request?: LeaveRequest;
	mode: "view" | "reject" | "approve" | "apply" | "applyOwn";
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
 * own applications, with nothing to grant. "Team requests" is the
 * company's requests in one Branch, the first by default, or every Branch
 * in reach, and optionally one Department; "Team timeline" draws one
 * Branch at a time. Both are read
 * through the person's grants, with applying on behalf, approving and
 * rejecting for the people they may decide for. Beneath the tabs, one
 * toolbar holds the view's units, filter and action. The view, units and
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
	const view: View = canRead && search.view ? search.view : "mine";
	const team = view !== "mine";
	const workspace = useQuery({ ...workspaceQuery, retry });
	const requested = unitSelectionOf(search);
	// The same units the selector shows, so the lists ask for them before the URL names them.
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
	const window = useLeaveRequests(
		companyId,
		units.branches.length > 0 ? timelineQueryOf(shownUnits, range) : undefined,
		view === "timeline"
	);
	const actions = useLeaveActions(companyId);
	const [dialog, setDialog] = useState<Dialog | null>(null);
	const [refusal, setRefusal] = useState<
		Refusal<ApplyField | DecisionField> | undefined
	>();
	const [message, setMessage] = useState("");
	const [employeeSearch, setEmployeeSearch] = useState("");
	const settled = useSettledSearch(employeeSearch);
	const people = useQuery(
		peopleQuery(
			companyId,
			{
				page: 1,
				sort: { field: "displayName", desc: false },
				status: "ACTIVE",
				search: settled,
			},
			canApply && dialog?.mode === "apply"
		)
	);
	const applying = dialog?.mode === "apply" || dialog?.mode === "applyOwn";
	const leaveTypes = useQuery(activeLeaveTypesQuery(companyId, applying));
	// Anything that changes which requests are listed starts again from the first page.
	const show = (next: LeaveSearch): void => {
		void navigate({
			search: (previous) => ({ ...previous, page: undefined, ...next }),
		});
	};
	const close = (): void => {
		setDialog(null);
		setRefusal(undefined);
	};
	const done = (text: string): void => {
		close();
		setMessage(text);
	};
	const approve = (request: LeaveRequest, comment: string): void => {
		actions.approve.mutate(
			{ request, comment },
			{
				onSuccess: () => {
					done(t("leave.approved", { name: request.displayName }));
				},
				onError: (error) => {
					setRefusal(decisionRefusal(error, t));
				},
			}
		);
	};
	// Each request is decided where its member is filed; nobody decides their own, whatever their roles.
	const canReview = (request: LeaveRequest): boolean =>
		request.membershipId !== ownMembershipId &&
		access.can("leave_request:review", recordScope(request.departmentId));
	const busy =
		actions.approve.isPending ||
		actions.reject.isPending ||
		actions.apply.isPending ||
		actions.applyOwn.isPending;
	const current = view === "mine" ? mine : view === "requests" ? list : window;
	const listProblem = problemOf(current, t, view === "mine");
	// The timeline has no status filter; My leave has no Department. The Branch is the header's scope.
	const showsStatus = view !== "timeline";
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
			canApply &&
			!noBranches && (
				<Button
					leadingIcon={<PlusIcon />}
					onClick={() => {
						setDialog({ mode: "apply" });
					}}
				>
					{t("leave.apply")}
				</Button>
			)
		);
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
					chips={<FilterChips chips={chips} onClearAll={clearFilters} />}
					className="mt-6 mb-8"
					label={t("leave.controls")}
					filters={
						<>
							<FiltersPopover count={chips.length}>
								{team && (
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
							{view === "timeline" && (
								<LeaveRangeNavigator range={range} onRangeChange={setRange} />
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
									canReview={canReview}
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
								<LeaveTimeline
									range={range}
									requests={window.status === "ready" ? window.items : []}
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
					busy={busy}
					canReview={dialog.request ? canReview(dialog.request) : false}
					leaveTypes={leaveTypes.data}
					mode={dialog.mode === "applyOwn" ? "apply" : dialog.mode}
					refusal={refusal}
					request={dialog.request}
					employees={
						dialog.mode === "apply"
							? {
									search: employeeSearch,
									onSearch: setEmployeeSearch,
									options: (people.data?.items ?? []).filter((person) =>
										access.can(
											"leave_request:create",
											recordScope(person.departmentId)
										)
									),
								}
							: undefined
					}
					onApprove={approve}
					onClose={close}
					onCreate={(membershipId, body) => {
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
						if (membershipId === null) actions.applyOwn.mutate(body, handlers);
						else actions.apply.mutate({ membershipId, body }, handlers);
					}}
					onReject={(request, reason) => {
						actions.reject.mutate(
							{ request, reason },
							{
								onSuccess: () => {
									done(t("leave.rejected", { name: request.displayName }));
								},
								onError: (error) => {
									setRefusal(decisionRefusal(error, t));
								},
							}
						);
					}}
				/>
			)}
		</div>
	);
};
