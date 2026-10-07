import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { DateRange } from "@/components/forms/Calendar";
import type { FunctionComponent } from "@/common/types";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { PlusIcon } from "@/components/ui/Icon";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/Tabs";
import { activeBranchesQuery } from "@/features/leave/api";
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
	type LeaveList,
} from "@/features/leave/useLeaveRequests";
import type { Refusal } from "@/features/organisation/refusal";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { peopleQuery } from "@/features/people/api";
import { useSettledSearch } from "@/features/people/usePeople";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { useCan, useCanAnywhere } from "@/features/workspace/useCan";

const route = getRouteApi("/_authenticated/_app/leave");

type Dialog = {
	request?: LeaveRequest;
	mode: "view" | "reject" | "apply";
};

/** The copy a list that is not ready is explained with, if any. */
const problemOf = (
	list: LeaveList,
	t: TFunction
): { message: string; alert: boolean } | undefined => {
	if (list.status === "hidden")
		return { message: t("leave.hidden"), alert: false };
	if (list.status === "error")
		return { message: t("leave.failed"), alert: true };
	return undefined;
};

/**
 * The company's leave, one Branch at a time: the requests table and the
 * timeline, both read through the person's grants, and applying, approving
 * and rejecting for the people they may decide for. The view, Branch and
 * table state live in the URL; the timeline's window stays on the page.
 * Page-level composition only: the parts live in `features/leave`.
 */
export const Leave = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t, i18n } = useTranslation();
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const can = useCan();
	const canAnywhere = useCanAnywhere();
	const canRead = canAnywhere(LEAVE_READ_KEYS);
	const canApply = canAnywhere(["leave_request:create"]);
	const branches = useQuery(activeBranchesQuery(companyId, canRead));
	const branchRows = branches.data?.items ?? [];
	const selected =
		branchRows.find((branch) => branch.branchId === search.branch) ??
		branchRows[0];
	const countries = [
		...new Set(branchRows.map((branch) => branch.country)),
	].sort((a, b) => a.localeCompare(b, i18n.language));
	const regionName = new Intl.DisplayNames([i18n.language], { type: "region" });
	const timeline = search.view === "timeline";
	const [range, setRange] = useState<DateRange>(defaultRange);
	const list = useLeaveRequests(
		companyId,
		selected && leaveQueryOf(search, selected.branchId),
		!timeline
	);
	const window = useLeaveRequests(
		companyId,
		selected && timelineQueryOf(selected.branchId, range),
		timeline
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
	const canReview = (request: LeaveRequest): boolean =>
		can("leave_request:review", request.departmentId ?? undefined);
	const busy =
		actions.approve.isPending ||
		actions.reject.isPending ||
		actions.apply.isPending;
	const listProblem = problemOf(timeline ? window : list, t);
	return (
		<div>
			<div className="flex flex-wrap items-start justify-between gap-6">
				<div>
					<h1 className="text-2xl font-semibold text-neutral-900 sm:text-[32px] sm:leading-11">
						{t("leave.title")}
					</h1>
					<p className="mt-3 text-sm text-neutral-800">{t("leave.subtitle")}</p>
				</div>
				{selected && (
					<div className="flex flex-wrap items-center gap-5 pt-1">
						<div className="flex items-center gap-3">
							<span className="text-sm text-neutral-800">
								{t("leave.country")}
							</span>
							<Select
								aria-label={t("leave.country")}
								className="w-44 font-semibold text-ink-blue-900"
								value={selected.country}
								options={countries.map((value) => ({
									value,
									label: regionName.of(value) ?? value,
								}))}
								onChange={(country) => {
									const first = branchRows.find(
										(branch) => branch.country === country
									);
									if (first) show({ branch: first.branchId });
								}}
							/>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-sm text-neutral-800">
								{t("leave.branch")}
							</span>
							<Select
								aria-label={t("leave.branch")}
								className="w-44 font-semibold text-ink-blue-900"
								value={selected.branchId}
								options={branchRows
									.filter((branch) => branch.country === selected.country)
									.map((branch) => ({
										value: branch.branchId,
										label: branch.name,
									}))}
								onChange={(branch) => {
									show({ branch });
								}}
							/>
						</div>
					</div>
				)}
			</div>
			{branches.isSuccess && branchRows.length === 0 && (
				<p className="mt-8 text-sm text-neutral-700">{t("leave.noBranches")}</p>
			)}
			<Tabs
				className="mt-8"
				selectedIndex={timeline ? 1 : 0}
				onChange={(index) => {
					show({ view: index === 1 ? "timeline" : undefined });
				}}
			>
				<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
					<TabList aria-label={t("leave.views")}>
						<Tab className="text-xl!">{t("leave.requests")}</Tab>
						<Tab className="text-xl!">{t("leave.timeline")}</Tab>
					</TabList>
					{canApply && selected && (
						<Button
							className="bg-ink-blue-900! hover:bg-ink-blue-800!"
							leadingIcon={<PlusIcon />}
							onClick={() => {
								setDialog({ mode: "apply" });
							}}
						>
							{t("leave.apply")}
						</Button>
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
								canReview={canReview}
								page={search.page ?? 1}
								rows={list.status === "ready" ? list.items : []}
								sort={leaveQueryOf(search, "").sort}
								status={search.status}
								total={list.status === "ready" ? list.total : 0}
								onApprove={approve}
								onOpen={(request, rejecting = false) => {
									setDialog({ request, mode: rejecting ? "reject" : "view" });
								}}
								onPageChange={(page) => {
									void navigate({
										search: (previous) => ({
											...previous,
											page: pageParameter(page),
										}),
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
					mode={dialog.mode}
					refusal={refusal}
					request={dialog.request}
					employees={{
						search: employeeSearch,
						onSearch: setEmployeeSearch,
						options: (people.data?.items ?? []).filter((person) =>
							can("leave_request:create", person.departmentId ?? undefined)
						),
					}}
					onApprove={approve}
					onClose={close}
					onCreate={(membershipId, body) => {
						actions.apply.mutate(
							{ membershipId, body },
							{
								onSuccess: (created) => {
									done(t("leave.applied", { name: created.displayName }));
								},
								onError: (error) => {
									const next = applyRefusal(error, t);
									setRefusal(next);
									if (next.refreshMembers) void people.refetch();
								},
							}
						);
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
