import { getRouteApi, Link, useRouteContext } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Toast } from "@/components/ui/Toast";
import { cardLinkClasses } from "@/features/dashboard/cardStyles";
import { CustomiseHomeDialog } from "@/features/dashboard/CustomiseHomeDialog";
import {
	useHiddenSections,
	useSaveHiddenSections,
} from "@/features/dashboard/dashboardPreferences";
import { DASHBOARD_UNIT_RULES } from "@/features/dashboard/dashboardUnitRules";
import { HomeCounts } from "@/features/dashboard/HomeCounts";
import { cardSpans, type CardSpan } from "@/features/dashboard/homeLayout";
import {
	HOME_SECTIONS,
	isShown,
	sectionsInReach,
	withSectionShown,
	type HomeSection,
} from "@/features/dashboard/homeSections";
import {
	LeaveToDecideCard,
	type LeaveStep,
} from "@/features/dashboard/LeaveToDecideCard";
import { NextRosterCard } from "@/features/dashboard/NextRosterCard";
import { OpenCoverOffersCard } from "@/features/dashboard/OpenCoverOffersCard";
import { PeopleEventsCard } from "@/features/dashboard/PeopleEventsCard";
import { SetupChecklistCard } from "@/features/dashboard/SetupChecklistCard";
import { ShortShiftsCard } from "@/features/dashboard/ShortShiftsCard";
import { useActivityPage } from "@/features/dashboard/useActivityPage";
import { useHomeSections } from "@/features/dashboard/useHomeSections";
import { useSetupChecklist } from "@/features/dashboard/useSetupChecklist";
import { WaitingApprovalsCard } from "@/features/dashboard/WaitingApprovalsCard";
import type { LeaveRequest } from "@/features/leave/api";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
import { useLeaveDecision } from "@/features/leave/useLeaveDecision";
import { SCHEDULING_KEYS } from "@/features/scheduling/schedulingSearch";
import { Can } from "@/features/workspace/Can";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/");

const key = "dashboard";

/**
 * Home's one grid: a single column on small screens and two from `lg`, its
 * cards aligned to the top so none stretches to a taller neighbour.
 */
const homeGridClasses =
	"mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2";

/** A card's place on the grid: the whole row, or one of its two columns. */
const SPAN_CLASSES: Record<CardSpan, string> = {
	full: "lg:col-span-2",
	half: "",
};

/** The sections that are never a card: who is off today is one count in the line above the cards. */
const NOT_A_CARD: ReadonlyArray<HomeSection> = ["off-today"];

/** The leave request open in the dialog, and what the person is doing with it. */
type Decision = { request: LeaveRequest; mode: LeaveStep };

/** Today as Home's subtitle writes it, e.g. "Monday 16 Nov 2026". */
const todayLabel = (language: string): string =>
	new Intl.DateTimeFormat(language, {
		weekday: "long",
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date());

/** Home for the settled company: its counts, cards and all-clear note, with the dialogs they open. */
const Dashboard = ({
	displayName,
}: {
	/** The signed-in person's name, for the greeting. */
	displayName: string;
}): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const companyId = useCurrentCompanyId();
	// The header's Branch, resolved as the header resolves it; every Branch in reach when "All branches" is chosen.
	const branch = useUnitSelection(
		companyId,
		LEAVE_READ_KEYS,
		unitSelectionOf(route.useSearch()),
		DASHBOARD_UNIT_RULES
	).branch;
	const [decision, setDecision] = useState<Decision>();
	const [toast, setToast] = useState<{ id: number; message: string }>();
	const [customising, setCustomising] = useState(false);
	const access = useAccess();
	const hidden = useHiddenSections(companyId);
	const saveHidden = useSaveHiddenSections(companyId);
	const hiddenSections = hidden.status === "ready" ? hidden.hiddenSections : [];
	// A section is read and shown only once the person's choice is known, and only if they keep it.
	const shown = (section: HomeSection): boolean =>
		hidden.status === "ready" && isShown(section, hiddenSections);
	const home = useHomeSections(companyId, branch?.branchId, shown);
	// Read only to learn whether the person may open Recent activity; the page lists it.
	const activity = useActivityPage(companyId, 1, 1);
	const setup = useSetupChecklist(companyId);

	const notify = (message: string): void => {
		setToast((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	};
	// Home says the outcome in its own toast.
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

	const cardOf: Record<HomeSection, ReactNode> = {
		"short-shifts": <ShortShiftsCard shortShifts={home.shortShifts} />,
		"leave-to-decide": (
			<LeaveToDecideCard
				busy={leaveDecision.busy}
				// Nobody decides their own leave; each request is decided where its member is filed, or by its flow's open step.
				canDecide={leaveDecision.canDecide}
				pending={home.pendingLeave}
				onOpen={(request, mode) => {
					setDecision({ request, mode });
				}}
			/>
		),
		"waiting-approvals": (
			<WaitingApprovalsCard approvals={home.waitingApprovals} />
		),
		"next-roster": (
			<NextRosterCard
				comingMonday={home.comingMonday}
				rows={home.rostersToDo}
			/>
		),
		"cover-offers": (
			<OpenCoverOffersCard
				myOffers={home.myOffers}
				teamOffers={home.teamOffers}
			/>
		),
		"off-today": null,
		"people-events": <PeopleEventsCard events={home.peopleEvents} />,
	};
	// A section with something to show is a card; one with nothing to act on is a sentence in the note below.
	const cards = HOME_SECTIONS.filter(
		(section) =>
			home.states[section] === "content" && !NOT_A_CARD.includes(section)
	);
	const spans = cardSpans(cards);
	const clear = HOME_SECTIONS.filter(
		(section) => home.states[section] === "empty"
	);

	return (
		<>
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-1">
					{/* From `lg` the header carries the greeting; below it the page does, in the title's place. */}
					<p className="text-2xl text-neutral-900 lg:hidden">
						<Trans
							i18nKey="shell.welcome"
							values={{ name: displayName }}
							components={{
								name: <span className="font-medium text-ink-blue-900" />,
							}}
						/>
					</p>
					<h1 className="text-[2rem] leading-10 font-medium text-neutral-900 max-lg:sr-only">
						{t("shell.navigation.dashboard")}
					</h1>
					<p className="text-sm text-neutral-800">
						{t(`${key}.subtitle`, {
							branch: branch?.name ?? t("workspace.branchSelector.allBranches"),
							day: todayLabel(formattingLocale(i18n)),
						})}
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Can anyOf={SCHEDULING_KEYS} at="anywhere">
						<Button size="sm" to="/scheduling" variant="secondary">
							{t(`${key}.viewRosters`)}
						</Button>
					</Can>
					<Button
						size="sm"
						variant="secondary"
						onClick={() => {
							setCustomising(true);
						}}
					>
						{t(`${key}.customise.open`)}
					</Button>
				</div>
			</div>
			{setup.status === "shown" && (
				<SetupChecklistCard
					canImportOrganisation={setup.canImportOrganisation}
					canImportPeople={setup.canImportPeople}
					className="mt-6"
					counts={setup.counts}
					progress={setup.progress}
					onDismiss={setup.dismiss}
				/>
			)}
			<HomeCounts className="mt-6" counts={home.counts} />
			{cards.length > 0 && (
				<div className={homeGridClasses}>
					{cards.map((section) => (
						<div
							key={section}
							className={SPAN_CLASSES[spans.get(section) ?? "full"]}
							id={section}
						>
							{cardOf[section]}
						</div>
					))}
				</div>
			)}
			{clear.length > 0 && (
				<Callout className="mt-6">
					{cards.length === 0 && `${t(`${key}.calm.allClear`)} `}
					{clear.map((section) => t(`${key}.calm.${section}`)).join(" ")}
				</Callout>
			)}
			{activity.status !== "hidden" && (
				<Link className={`${cardLinkClasses} mt-6 inline-block`} to="/activity">
					{t("organisation.activity.title")}
				</Link>
			)}
			<CustomiseHomeDialog
				hiddenSections={hiddenSections}
				open={customising}
				saveFailed={saveHidden.isError}
				sections={sectionsInReach((keys) => access.canAny(keys, "anywhere"))}
				onClose={() => {
					setCustomising(false);
					saveHidden.reset();
				}}
				onReset={() => {
					saveHidden.mutate([]);
				}}
				onToggle={(section, isNowShown) => {
					saveHidden.mutate(
						withSectionShown(hiddenSections, section, isNowShown)
					);
				}}
			/>
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
 * Home, "What needs you": a line of counts, then a card for each thing
 * with something to act on, most urgent first, on one two-column grid:
 * shifts short by cause, leave to decide, approvals waiting, the rosters
 * still to get ready, cover offers not answered, and who joins, ends
 * probation or leaves. A section with nothing to act on is a sentence in
 * the all-clear note, never an empty box. Each is left out where the
 * person's grants don't reach it, or where they chose to hide it under
 * Customise; a hidden section is not read.
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
