import { getRouteApi, Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { ApproveRequestsIcon, CrossIcon, TickIcon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import {
	COLLAPSED_ROW_COUNT,
	ExpandableList,
} from "@/components/ui/ExpandableList";
import { Toast } from "@/components/ui/Toast";
import { DASHBOARD_UNIT_RULES } from "@/features/dashboard/dashboardUnitRules";
import {
	nextMonday,
	thisAndNextMonth,
	thisAndNextWeek,
	todayAndTomorrow,
} from "@/features/dashboard/dashboardDates";
import { NextRosterCard } from "@/features/dashboard/NextRosterCard";
import { OffTodayCard } from "@/features/dashboard/OffTodayCard";
import { OpenCoverOffersCard } from "@/features/dashboard/OpenCoverOffersCard";
import { ShortShiftsCard } from "@/features/dashboard/ShortShiftsCard";
import { NotificationItem } from "@/features/dashboard/NotificationItem";
import { SetupChecklistCard } from "@/features/dashboard/SetupChecklistCard";
import {
	useDaysOff,
	useMyOpenCoverOffers,
	useNextRoster,
	useShortages,
	useTeamCoverOffers,
} from "@/features/dashboard/useDashboardReads";
import { useActivityPage } from "@/features/dashboard/useActivityPage";
import { useSetupChecklist } from "@/features/dashboard/useSetupChecklist";
import type { LeaveRequest } from "@/features/leave/api";
import { formatPeriod } from "@/features/leave/dates";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { leaveTypeLabel } from "@/features/leave/leaveTypeLabel";
import { useLeaveDecision } from "@/features/leave/useLeaveDecision";
import { useLeaveRequests } from "@/features/leave/useLeaveRequests";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/");

const key = "dashboard";

/** Pending leave read for the list; more than the list shows, so "See all" knows there are more. */
const PENDING_LEAVE_COUNT = 20;
/** Enough approved leave to name everyone off today and tomorrow in one unit. */
const OFF_TODAY_LEAVE_COUNT = 50;

const viewAllLink =
	"shrink-0 text-base font-semibold text-ink-blue-900 underline decoration-2 underline-offset-1 hover:text-ink-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500";

/** Home's one grid: a single column of cards aligned to the top, so no card stretches or sits alone. */
const HOME_GRID_CLASSES = "mt-6 grid grid-cols-1 items-start gap-6";

type Decision = { request: LeaveRequest; mode: "view" | "reject" | "approve" };

const Dashboard = ({
	displayName,
}: {
	/** The signed-in person's name, for the greeting. */
	displayName: string;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const language = formattingLocale(i18n);
	const companyId = useCurrentCompanyId();
	// The header's Branch, resolved as the header resolves it; every Branch in reach when "All branches" is chosen.
	const branchId = useUnitSelection(
		companyId,
		LEAVE_READ_KEYS,
		unitSelectionOf(route.useSearch()),
		DASHBOARD_UNIT_RULES
	).branch?.branchId;
	const [decision, setDecision] = useState<Decision>();
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const sort = { field: "requestedAt", desc: true } as const;
	const pending = useLeaveRequests(companyId, {
		page: 1,
		size: PENDING_LEAVE_COUNT,
		sort,
		status: "PENDING",
		branchId,
	});
	// Read only to learn whether the person may open Recent activity; the page lists it.
	const activity = useActivityPage(companyId, 1, 1);
	const setup = useSetupChecklist(companyId);
	const now = new Date();
	const units = { branchId };
	const offDays = todayAndTomorrow(now);
	const comingMonday = nextMonday(now);
	const shortages = useShortages(companyId, units, thisAndNextWeek(now));
	const teamOffers = useTeamCoverOffers(companyId, units);
	const myOffers = useMyOpenCoverOffers(companyId);
	const nextRoster = useNextRoster(
		companyId,
		units,
		thisAndNextMonth(now),
		comingMonday
	);
	const daysOff = useDaysOff(companyId, units, offDays);
	const leaveOff = useLeaveRequests(companyId, {
		page: 1,
		size: OFF_TODAY_LEAVE_COUNT,
		sort: { field: "startDate", desc: false },
		status: "APPROVED",
		branchId,
		...offDays,
	});

	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	// The dashboard says the outcome in its own toast.
	const leaveDecision = useLeaveDecision(companyId, {
		ownConfirmation: true,
		onDecided: (message) => {
			setDecision(undefined);
			notify(message);
		},
	});
	const close = (): void => {
		setDecision(undefined);
		leaveDecision.clearRefusal();
	};
	const decided = (message: string): void => {
		close();
		notify(message);
	};
	// Nobody decides their own leave; each request is decided where its member is filed, or by its flow's open step.
	const canReview = leaveDecision.canDecide;
	const busy = leaveDecision.busy;

	return (
		<>
			<h1 className="sr-only">{t("shell.navigation.dashboard")}</h1>
			{/* From `lg` the header carries the greeting; below it the page does. */}
			<p className="text-2xl text-neutral-900 lg:hidden">
				<Trans
					i18nKey="shell.welcome"
					values={{ name: displayName }}
					components={{
						name: <span className="font-medium text-ink-blue-900" />,
					}}
				/>
			</p>
			{setup.status === "shown" && (
				<SetupChecklistCard
					canImportOrganisation={setup.canImportOrganisation}
					canImportPeople={setup.canImportPeople}
					className="mt-6 lg:mt-0"
					counts={setup.counts}
					progress={setup.progress}
					onDismiss={setup.dismiss}
				/>
			)}
			{/* One column of to-do cards: each card is as tall as its content and spans the row, so none floats alone. */}
			<div className={HOME_GRID_CLASSES}>
				<ShortShiftsCard shortages={shortages} />
				{pending.status !== "hidden" && (
					<Card
						action={
							<Link className={viewAllLink} to="/leave">
								{t(`${key}.viewAll`)}
							</Link>
						}
						icon={ApproveRequestsIcon}
						title={t("notifications.pendingReview")}
					>
						{pending.status === "error" && (
							<p className="text-sm text-error-700" role="alert">
								{t(`${key}.notifications.failed`)}
							</p>
						)}
						{pending.status === "ready" && pending.items.length === 0 && (
							<p className="text-sm text-neutral-700">
								{t(`${key}.notifications.empty`)}
							</p>
						)}
						{pending.status === "ready" && pending.items.length > 0 && (
							<ExpandableList
								itemClassName="py-4 first:pt-0 last:pb-0"
								items={pending.items}
								keyOf={(request) => request.leaveRequestId}
								listClassName="flex flex-col divide-y divide-neutral-300"
								seeAll={
									pending.total > COLLAPSED_ROW_COUNT ? (
										<Link className={viewAllLink} to="/leave">
											{t(`${key}.notifications.seeAll`, {
												count: pending.total,
											})}
										</Link>
									) : undefined
								}
								renderItem={(request) => {
									const reviewable = canReview(request);
									// Under an approval flow, the step it waits on, beside its title.
									const stepTag = request.approval
										? t("approvals.meta.stepShort", {
												step: request.approval.currentStepOrder,
												total: request.approval.stepCount,
											})
										: undefined;
									return (
										<NotificationItem
											tag={stepTag}
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
													setDecision({ request, mode: "approve" });
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
												type: leaveTypeLabel(request, t),
											})}
											onOpen={() => {
												setDecision({ request, mode: "view" });
											}}
										/>
									);
								}}
							/>
						)}
					</Card>
				)}
				<NextRosterCard comingMonday={comingMonday} rows={nextRoster} />
				<OpenCoverOffersCard myOffers={myOffers} teamOffers={teamOffers} />
				<OffTodayCard
					days={[offDays.from, offDays.to]}
					daysOff={daysOff}
					leave={
						leaveOff.status === "ready"
							? { status: "ready", data: leaveOff.items }
							: leaveOff
					}
				/>
			</div>
			{activity.status !== "hidden" && (
				<Link className={`${viewAllLink} mt-6 inline-block`} to="/activity">
					{t("organisation.activity.title")}
				</Link>
			)}
			{decision && (
				<LeaveRequestDialog
					key={`${decision.request.leaveRequestId}-${decision.mode}`}
					lifecycle={{ companyId, own: false, onDone: decided }}
					mode={decision.mode}
					request={decision.request}
					review={leaveDecision.reviewOf(decision.request)}
					onClose={close}
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
 * Home, "What needs you": a to-do list, most urgent first. Shifts short,
 * leave to decide, each Department's next roster, cover offers not answered,
 * and who is off today and tomorrow; each list stops at five rows with a
 * toggle. Each card is left out where the person's grants don't reach it.
 */
export const Home = (): FunctionComponent => {
	const context = useRouteContext({ from: "/_authenticated" });
	if (
		!("currentCompany" in context) ||
		context.currentCompany.kind !== "settled" ||
		!context.currentUser
	)
		return null;
	return <Dashboard displayName={context.currentUser.displayName} />;
};
