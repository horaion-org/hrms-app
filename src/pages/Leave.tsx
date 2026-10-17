import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DateRange } from "@/components/forms/Calendar";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";
import { defaultRange } from "@/features/leave/dates";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { LeaveRequests } from "@/features/leave/LeaveRequests";
import {
	applyRefusal,
	decisionRefusal,
	type ApplyField,
} from "@/features/leave/leaveRefusal";
import {
	leaveQueryOf,
	myLeaveQueryOf,
	pageParameter,
	sortParameter,
	timelineQueryOf,
	type LeaveSearch,
} from "@/features/leave/leaveSearch";
import { LeaveTimeline } from "@/features/leave/LeaveTimeline";
import type { LeaveRequest } from "@/features/leave/types";
import {
	useLeaveActions,
	useLeaveRequests,
	useMyLeaveRequests,
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
import { BranchSelector } from "@/features/workspace/BranchSelector";
import { branchChoices, chosenBranch } from "@/features/workspace/unitChoices";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { recordScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

const route = getRouteApi("/_authenticated/_app/leave");

type Dialog = {
	request?: LeaveRequest;
	mode: "view" | "reject" | "apply" | "applyOwn";
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
 * timeline" are the company's requests one Branch at a time, read through
 * the person's grants, with applying on behalf, approving and rejecting for
 * the people they may decide for. The view, Branch and table state live in
 * the URL; the timeline's window stays on the page. Page-level composition
 * only: the parts live in `features/leave`.
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
	const branches = workspace.data
		? branchChoices(workspace.data, companyId, LEAVE_READ_KEYS)
		: undefined;
	// The same Branch the selector shows, so the list asks for it before the URL names it.
	const selected = chosenBranch(branches ?? [], search.branch);
	const [range, setRange] = useState<DateRange>(defaultRange);
	const mine = useMyLeaveRequests(
		companyId,
		myLeaveQueryOf(search),
		view === "mine"
	);
	const list = useLeaveRequests(
		companyId,
		selected && leaveQueryOf(search, selected.branchId),
		view === "requests"
	);
	const window = useLeaveRequests(
		companyId,
		selected && timelineQueryOf(selected.branchId, range),
		view === "timeline"
	);
	const actions = useLeaveActions(companyId);
	const [dialog, setDialog] = useState<Dialog | null>(null);
	const [refusal, setRefusal] = useState<
		Refusal<ApplyField | "reason"> | undefined
	>();
	const [message, setMessage] = useState("");
	const [problem, setProblem] = useState("");
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
		setProblem("");
		setMessage(text);
	};
	const refused = (next: Refusal<ApplyField | "reason">): void => {
		if (dialog) setRefusal(next);
		else setProblem(next.message ?? t("leave.refusal.decideFailed"));
	};
	const approve = (request: LeaveRequest): void => {
		actions.approve.mutate(request, {
			onSuccess: () => {
				done(t("leave.approved", { name: request.displayName }));
			},
			onError: (error) => {
				refused(decisionRefusal(error, t));
			},
		});
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
	const chooseBranch = (branch: string | undefined): void => {
		// The selector naming the Branch already shown keeps the page, the history entry and its state.
		if (branch === selected?.branchId)
			void navigate({
				search: (previous) => ({ ...previous, branch }),
				replace: true,
				state: true,
			});
		else show({ branch });
	};
	const paging = (page: number): void => {
		void navigate({
			search: (previous) => ({ ...previous, page: pageParameter(page) }),
		});
	};
	return (
		<div>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="text-2xl font-semibold text-neutral-900 sm:text-[32px] sm:leading-11">
						{t("leave.title")}
					</h1>
					<p className="mt-3 text-sm text-neutral-800">{t("leave.subtitle")}</p>
				</div>
				{team && (
					<BranchSelector
						className="pt-1"
						companyId={companyId}
						keys={LEAVE_READ_KEYS}
						value={search.branch}
						onChange={chooseBranch}
					/>
				)}
			</div>
			{team && branches?.length === 0 && (
				<p className="mt-8 text-sm text-neutral-700">{t("leave.noBranches")}</p>
			)}
			<Tabs
				className="mt-8"
				selectedIndex={VIEWS.indexOf(view)}
				onChange={(index) => {
					const next = VIEWS[index] ?? "mine";
					show({ view: next === "mine" ? undefined : next });
				}}
			>
				<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
					<TabList aria-label={t("leave.views")}>
						<Tab className="text-xl!">{t("leave.myLeave")}</Tab>
						{canRead && (
							<Tab className="text-xl!">{t("leave.teamRequests")}</Tab>
						)}
						{canRead && (
							<Tab className="text-xl!">{t("leave.teamTimeline")}</Tab>
						)}
					</TabList>
					{view === "mine" ? (
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
						selected && (
							<Button
								leadingIcon={<PlusIcon />}
								onClick={() => {
									setDialog({ mode: "apply" });
								}}
							>
								{t("leave.apply")}
							</Button>
						)
					)}
				</div>
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
								status={search.status}
								total={mine.status === "ready" ? mine.total : 0}
								onApprove={() => {}}
								onPageChange={paging}
								onOpen={(request) => {
									setDialog({ request, mode: "view" });
								}}
								onSortChange={(sort) => {
									show({ sort: sortParameter(sort) });
								}}
								onStatusChange={(status) => {
									show({ status });
								}}
							/>
						</TabPanel>
						{canRead && (
							<TabPanel>
								<LeaveRequests
									canReview={canReview}
									page={search.page ?? 1}
									rows={list.status === "ready" ? list.items : []}
									sort={leaveQueryOf(search, "").sort}
									status={search.status}
									total={list.status === "ready" ? list.total : 0}
									onApprove={approve}
									onPageChange={paging}
									onOpen={(request, rejecting = false) => {
										setDialog({
											request,
											mode: rejecting ? "reject" : "view",
										});
									}}
									onSortChange={(sort) => {
										show({ sort: sortParameter(sort) });
									}}
									onStatusChange={(status) => {
										show({ status });
									}}
								/>
							</TabPanel>
						)}
						{canRead && (
							<TabPanel>
								<LeaveTimeline
									range={range}
									requests={window.status === "ready" ? window.items : []}
									onRangeChange={setRange}
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
			{problem && (
				<p className="mt-4 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
			{dialog && (
				<LeaveRequestDialog
					key={`${dialog.request?.leaveRequestId ?? "new"}-${dialog.mode}`}
					busy={busy}
					canReview={dialog.request ? canReview(dialog.request) : false}
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
									refused(decisionRefusal(error, t));
								},
							}
						);
					}}
				/>
			)}
		</div>
	);
};
