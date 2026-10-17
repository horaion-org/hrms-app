import { Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ActivityItem } from "@/components/ui/ActivityItem";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
	AddStaffIcon,
	ApproveRequestsIcon,
	CrossIcon,
	FillShiftsIcon,
	GenerateScheduleIcon,
	SchedulingIcon,
	TickIcon,
} from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { Toast } from "@/components/ui/Toast";
import {
	EXAMPLE_NOTIFICATIONS,
	exampleWorkforce,
} from "@/features/dashboard/exampleDashboard";
import { NotificationItem } from "@/features/dashboard/NotificationItem";
import { QuickActions } from "@/features/dashboard/QuickActions";
import { useActivityPage } from "@/features/dashboard/useActivityPage";
import type { LeaveRequest } from "@/features/leave/api";
import { formatPeriod } from "@/features/leave/dates";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { decisionRefusal } from "@/features/leave/leaveRefusal";
import {
	useLeaveActions,
	useLeaveRequests,
} from "@/features/leave/useLeaveRequests";
import {
	activityDetails,
	describeActivity,
} from "@/features/organisation/activity";
import type { Refusal } from "@/features/organisation/refusal";
import {
	useCurrentCompanyId,
	useCurrentMembershipId,
} from "@/features/organisation/useCurrentCompanyId";
import { BranchSelector } from "@/features/workspace/BranchSelector";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { recordScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

const key = "dashboard";

const NOTIFICATION_COUNT = 5;
const ACTIVITY_COUNT = 4;

const sectionHeading = "text-base font-semibold text-ink-blue-600 uppercase";
const viewAllLink =
	"shrink-0 text-base font-semibold text-ink-blue-900 underline decoration-2 underline-offset-1 hover:text-ink-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

type Decision = { request: LeaveRequest; mode: "view" | "reject" };

const Dashboard = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = i18n.resolvedLanguage ?? i18n.language;
	const companyId = useCurrentCompanyId();
	const ownMembershipId = useCurrentMembershipId();
	const access = useAccess();
	const [branchId, setBranchId] = useState<string>();
	const [decision, setDecision] = useState<Decision>();
	const [refusal, setRefusal] = useState<Refusal<"reason">>();
	const [problem, setProblem] = useState("");
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const [workforce] = useState(exampleWorkforce);
	const numbers = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
	const sort = { field: "requestedAt", desc: true } as const;
	const pending = useLeaveRequests(companyId, {
		page: 1,
		size: NOTIFICATION_COUNT,
		sort,
		status: "PENDING",
		branchId,
	});
	const approved = useLeaveRequests(companyId, {
		page: 1,
		size: 1,
		sort,
		status: "APPROVED",
		branchId,
	});
	const rejected = useLeaveRequests(companyId, {
		page: 1,
		size: 1,
		sort,
		status: "REJECTED",
		branchId,
	});
	const activity = useActivityPage(companyId, 1, ACTIVITY_COUNT);
	const actions = useLeaveActions(companyId, { ownConfirmation: true });
	const busy = actions.approve.isPending || actions.reject.isPending;
	const now = new Date();
	const exampleTag = (
		<Badge className="shrink-0" tone="neutral">
			{t(`${key}.exampleTag`)}
		</Badge>
	);

	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	const close = (): void => {
		setDecision(undefined);
		setRefusal(undefined);
	};
	const decided = (message: string): void => {
		close();
		setProblem("");
		notify(message);
	};
	const refused = (error: Error): void => {
		const next = decisionRefusal(error, t);
		if (decision) setRefusal(next);
		else setProblem(next.message ?? t("leave.refusal.decideFailed"));
	};
	const approve = (request: LeaveRequest): void => {
		actions.approve.mutate(request, {
			onSuccess: () => {
				decided(t("leave.approved", { name: request.displayName }));
			},
			onError: refused,
		});
	};
	// Nobody decides their own leave, and each request is decided where its member is filed.
	const canReview = (request: LeaveRequest): boolean =>
		request.membershipId !== ownMembershipId &&
		access.can("leave_request:review", recordScope(request.departmentId));

	const resolvedShare = ((): number | undefined => {
		if (
			pending.status !== "ready" ||
			approved.status !== "ready" ||
			rejected.status !== "ready"
		)
			return undefined;
		const resolved = approved.total + rejected.total;
		const all = resolved + pending.total;
		return all === 0 ? 100 : Math.round((resolved / all) * 100);
	})();

	return (
		<>
			<h1 className="sr-only">{t("shell.navigation.dashboard")}</h1>
			<div className="-mx-4 -mt-7 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-400 px-4 pt-5 pb-5 sm:-mx-10 sm:-mt-10 sm:px-10">
				<Button
					leadingIcon={<SchedulingIcon />}
					size="sm"
					to="/scheduling"
					variant="secondary"
				>
					{t(`${key}.viewSchedule`)}
				</Button>
				<BranchSelector
					allowAll
					companyId={companyId}
					keys={LEAVE_READ_KEYS}
					value={branchId}
					onChange={setBranchId}
				/>
			</div>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
			<div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,666fr)_minmax(0,390fr)]">
				<div>
					<StatCard
						action={exampleTag}
						size="lg"
						title={t(`${key}.workforce.title`)}
						value={numbers.format(workforce.active)}
						variant="tile"
					>
						<dl className="mt-7 grid grid-cols-3 gap-7">
							{(["onShift", "onCall", "remote"] as const).map((split) => (
								<div key={split}>
									<dt className="text-sm text-neutral-800">
										{t(`${key}.workforce.${split}`)}
									</dt>
									<dd className="mt-2 text-[2rem] leading-10 font-medium text-neutral-900">
										{numbers.format(workforce[split])}
									</dd>
								</div>
							))}
						</dl>
					</StatCard>
					<div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
						<StatCard
							action={exampleTag}
							caption={t(`${key}.coverage.caption`)}
							title={t(`${key}.coverage.title`)}
							variant="tile"
							value={t("scheduling.overview.percent", {
								value: numbers.format(workforce.coverage),
							})}
						/>
						{pending.status !== "hidden" && (
							<StatCard
								title={t(`${key}.approvals.title`)}
								variant="tile"
								value={
									pending.status === "ready"
										? numbers.format(pending.total)
										: t("organisation.unknownCount")
								}
							>
								{resolvedShare !== undefined && (
									<div className="mt-2 flex items-center gap-4">
										<ProgressBar
											className="w-41 shrink-0"
											label={t(`${key}.approvals.resolvedLabel`)}
											tone="accent"
											track="white"
											value={resolvedShare}
										/>
										<p className="text-sm text-neutral-800">
											{t(`${key}.approvals.resolved`, {
												value: resolvedShare,
											})}
										</p>
									</div>
								)}
							</StatCard>
						)}
					</div>
				</div>
				<section
					aria-labelledby="notifications"
					className="flex min-w-0 flex-col rounded-xl bg-neutral-200 px-6 pt-6 pb-2 lg:h-113"
				>
					<div className="flex items-center justify-between gap-4">
						<h2 className={sectionHeading} id="notifications">
							{t(`${key}.notifications.title`)}
						</h2>
						{pending.status !== "hidden" && (
							<Link className={viewAllLink} to="/leave">
								{t(`${key}.viewAll`)}
							</Link>
						)}
					</div>
					{pending.status === "error" && (
						<p className="mt-6 text-sm text-error-700" role="alert">
							{t(`${key}.notifications.failed`)}
						</p>
					)}
					<ul className="mt-6 min-h-0 flex-1 divide-y divide-neutral-400 overflow-y-auto pr-4">
						{pending.status === "ready" &&
							pending.items.map((request) => {
								const reviewable = canReview(request);
								return (
									<li key={request.leaveRequestId} className="py-5 first:pt-0">
										<NotificationItem
											detail={t(`${key}.notifications.leaveDetail`, {
												name: request.displayName,
												period: formatPeriod(
													request.startDate,
													request.endDate,
													language
												),
											})}
											primaryAction={{
												label: t(`${key}.notifications.approve`),
												icon: <TickIcon />,
												disabled: !reviewable || busy,
												onClick: () => {
													approve(request);
												},
											}}
											secondaryAction={{
												label: t(`${key}.notifications.deny`),
												icon: <CrossIcon />,
												disabled: !reviewable || busy,
												onClick: () => {
													setDecision({ request, mode: "reject" });
												},
											}}
											title={t(`${key}.notifications.leaveTitle`, {
												type: t(`leave.types.${request.leaveType}`),
											})}
											onOpen={() => {
												setDecision({ request, mode: "view" });
											}}
										/>
									</li>
								);
							})}
						{EXAMPLE_NOTIFICATIONS.map((example) => (
							<li key={example} className="py-5 first:pt-0">
								<NotificationItem
									detail={t(`${key}.notifications.examples.${example}.detail`)}
									tag={t(`${key}.exampleTag`)}
									title={t(`${key}.notifications.examples.${example}.title`)}
									primaryAction={{
										label: t(
											`${key}.notifications.examples.${example}.primary`
										),
										disabled: true,
									}}
									secondaryAction={{
										label: t(
											`${key}.notifications.examples.${example}.secondary`
										),
										disabled: true,
									}}
								/>
							</li>
						))}
					</ul>
				</section>
			</div>
			<div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,666fr)_minmax(0,390fr)]">
				{activity.status === "hidden" ? (
					<div />
				) : (
					<section aria-labelledby="recent-activity" className="lg:pr-6">
						<div className="flex items-center justify-between gap-4">
							<h2 className={sectionHeading} id="recent-activity">
								{t("organisation.activity.title")}
							</h2>
							<Link className={viewAllLink} to="/activity">
								{t(`${key}.viewAll`)}
							</Link>
						</div>
						{activity.status === "error" && (
							<p className="mt-6 text-sm text-error-700" role="alert">
								{t("organisation.activity.failed")}
							</p>
						)}
						{activity.status === "ready" && activity.items.length === 0 && (
							<p className="mt-6 text-sm text-neutral-700">
								{t("organisation.activity.empty")}
							</p>
						)}
						{activity.status === "ready" && activity.items.length > 0 && (
							<ul className="mt-6 flex flex-col gap-7">
								{activity.items.map((event) => {
									const described = describeActivity(event, t);
									if (!described) return null;
									return (
										<li key={described.id}>
											<ActivityItem
												details={activityDetails(event, t, now, language)}
												icon={described.icon}
												title={described.title}
											/>
										</li>
									);
								})}
							</ul>
						)}
					</section>
				)}
				<section aria-labelledby="quick-actions">
					<h2 className={sectionHeading} id="quick-actions">
						{t(`${key}.quickActions.title`)}
					</h2>
					<QuickActions
						className="mt-6"
						label={t(`${key}.quickActions.title`)}
						actions={[
							{
								label: t(`${key}.quickActions.generate`),
								icon: GenerateScheduleIcon,
								to: "/scheduling/new",
							},
							{
								label: t(`${key}.quickActions.addStaff`),
								icon: AddStaffIcon,
								to: "/people/new",
							},
							{
								label: t(`${key}.quickActions.approve`),
								icon: ApproveRequestsIcon,
								to: "/leave",
							},
							{
								label: t(`${key}.quickActions.fillShifts`),
								icon: FillShiftsIcon,
								to: "/scheduling",
							},
						]}
					/>
				</section>
			</div>
			{decision && (
				<LeaveRequestDialog
					key={`${decision.request.leaveRequestId}-${decision.mode}`}
					busy={busy}
					canReview={canReview(decision.request)}
					mode={decision.mode}
					refusal={refusal}
					request={decision.request}
					onApprove={approve}
					onClose={close}
					onCreate={() => undefined}
					onReject={(request, reason) => {
						actions.reject.mutate(
							{ request, reason },
							{
								onSuccess: () => {
									decided(t("leave.rejected", { name: request.displayName }));
								},
								onError: refused,
							}
						);
					}}
				/>
			)}
			{toast && (
				<Toast
					key={toast.id}
					onDismiss={() => {
						setToast(undefined);
					}}
				>
					{toast.message}
				</Toast>
			)}
		</>
	);
};

/**
 * The Dashboard: the workforce at a glance, what is waiting on the person,
 * what changed lately, and shortcuts. Leave requests and activity are live;
 * the workforce and coverage figures are example data until their service
 * exists, and say so.
 */
export const Home = (): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	if (
		!("currentCompany" in context) ||
		context.currentCompany.kind !== "settled"
	)
		return null;
	return <Dashboard />;
};
