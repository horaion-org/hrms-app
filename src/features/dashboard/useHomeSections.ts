import type {
	PeopleEvent,
	TeamCoverOffer,
	WaitingApproval,
} from "@/features/dashboard/api";
import {
	comingPeopleDays,
	isoDay,
	nextMonday,
	thisAndNextMonth,
	thisAndNextWeek,
	todayOnly,
} from "@/features/dashboard/dashboardDates";
import type { GuardedRead } from "@/features/dashboard/guardedRead";
import {
	sectionStateOf,
	type SectionState,
} from "@/features/dashboard/homeLayout";
import {
	HOME_SECTIONS,
	type HomeSection,
} from "@/features/dashboard/homeSections";
import {
	rostersToDo,
	type NextRosterRow,
} from "@/features/dashboard/nextRoster";
import { peopleOffOn } from "@/features/dashboard/offToday";
import {
	shortShiftsByCause,
	type ShortShiftsByCause,
} from "@/features/dashboard/shortCauses";
import {
	useDaysOff,
	useMyOpenCoverOffers,
	useNextRoster,
	usePeopleEvents,
	useShortages,
	useStaffing,
	useTeamCoverOffers,
	useWaitingApprovals,
} from "@/features/dashboard/useDashboardReads";
import { approvalsNotListed } from "@/features/dashboard/waitingApprovals";
import {
	useLeaveRequests,
	type LeaveList,
} from "@/features/leave/useLeaveRequests";
import type { CoverOffer } from "@/features/scheduling/coverOffers/api";

/** Pending leave read for the list; more than the list shows, so "See all" knows there are more. */
const PENDING_LEAVE_COUNT = 20;
/** Enough approved leave to count everyone off today in one unit. */
const OFF_TODAY_LEAVE_COUNT = 50;

/** A read's own status, whatever it answers with. */
type ReadStatus = "hidden" | "pending" | "error" | "ready";

/** Everything Home shows: each section's answer, what it has to show, and how much needs the person. */
export type HomeSections = {
	/** The coming week's Monday, for the next-roster steps. */
	comingMonday: string;
	shortShifts: GuardedRead<ShortShiftsByCause>;
	pendingLeave: LeaveList;
	waitingApprovals: GuardedRead<Array<WaitingApproval>>;
	rostersToDo: GuardedRead<Array<NextRosterRow>>;
	teamOffers: GuardedRead<Array<TeamCoverOffer>>;
	myOffers: GuardedRead<Array<CoverOffer>>;
	peopleEvents: GuardedRead<Array<PeopleEvent>>;
	/** What each section has to show; a section the person hid is "hidden". */
	states: Record<HomeSection, SectionState>;
	/** How much each section has to act on, where it is known. */
	counts: Partial<Record<HomeSection, number>>;
};

/** Two reads' status as one section's: hidden when both are, else waiting on either, else failed if either did. */
const statusOfBoth = (first: ReadStatus, second: ReadStatus): ReadStatus => {
	if (first === "hidden" && second === "hidden") return "hidden";
	if (first === "pending" || second === "pending") return "pending";
	if (first === "error" || second === "error") return "error";
	return "ready";
};

/** A read's rows, or none until it answers. */
const rowsOf = <T>(read: GuardedRead<Array<T>>): Array<T> =>
	read.status === "ready" ? read.data : [];

/**
 * Home's sections for the units in view. A section the person hid is not
 * read. Short shifts wait for the staffing rules, so a rule nobody can
 * staff is never first listed day by day; a failed rules read lists them
 * as gaps.
 */
export const useHomeSections = (
	companyId: string,
	branchId: string | undefined,
	shown: (section: HomeSection) => boolean
): HomeSections => {
	const now = new Date();
	const today = isoDay(now);
	const units = { branchId };
	const comingMonday = nextMonday(now);
	const twoWeeks = thisAndNextWeek(now);

	const shortages = useShortages(
		companyId,
		units,
		twoWeeks,
		shown("short-shifts")
	);
	const staffing = useStaffing(
		companyId,
		units,
		twoWeeks,
		shown("short-shifts")
	);
	const pendingLeave = useLeaveRequests(
		companyId,
		{
			page: 1,
			size: PENDING_LEAVE_COUNT,
			sort: { field: "requestedAt", desc: true },
			status: "PENDING",
			branchId,
		},
		shown("leave-to-decide")
	);
	const waiting = useWaitingApprovals(
		companyId,
		units,
		shown("waiting-approvals")
	);
	const nextRoster = useNextRoster(
		companyId,
		units,
		thisAndNextMonth(now),
		comingMonday,
		shown("next-roster")
	);
	const teamOffers = useTeamCoverOffers(
		companyId,
		units,
		shown("cover-offers")
	);
	const myOffers = useMyOpenCoverOffers(companyId, shown("cover-offers"));
	const daysOff = useDaysOff(
		companyId,
		units,
		todayOnly(now),
		shown("off-today")
	);
	const leaveOff = useLeaveRequests(
		companyId,
		{
			page: 1,
			size: OFF_TODAY_LEAVE_COUNT,
			sort: { field: "startDate", desc: false },
			status: "APPROVED",
			branchId,
			...todayOnly(now),
		},
		shown("off-today")
	);
	const peopleEvents = usePeopleEvents(
		companyId,
		units,
		comingPeopleDays(now),
		shown("people-events")
	);

	const shortShifts: GuardedRead<ShortShiftsByCause> =
		shortages.status !== "ready"
			? shortages
			: staffing.status === "pending"
				? { status: "pending" }
				: {
						status: "ready",
						data: shortShiftsByCause(shortages.data, rowsOf(staffing)),
					};
	const pendingRows = pendingLeave.status === "ready" ? pendingLeave.items : [];
	// A leave request listed to decide is not said again among the approvals waiting.
	const waitingApprovals: GuardedRead<Array<WaitingApproval>> =
		waiting.status === "ready"
			? {
					status: "ready",
					data: approvalsNotListed(
						waiting.data,
						new Set(pendingRows.map((request) => request.leaveRequestId))
					),
				}
			: waiting;
	const toDo: GuardedRead<Array<NextRosterRow>> =
		nextRoster.status === "ready"
			? { status: "ready", data: rostersToDo(nextRoster.data) }
			: nextRoster;
	// With no Department to roster, there is nothing to say about the coming week.
	const nextRosterStatus: ReadStatus =
		nextRoster.status === "ready" && nextRoster.data.length === 0
			? "hidden"
			: nextRoster.status;
	const ownOffers = rowsOf(myOffers).length;
	const offers = rowsOf(teamOffers).length + ownOffers;
	// Without the team's offers in reach, the section shows only for the person's own.
	const ownOffersStatus: ReadStatus = ownOffers > 0 ? "ready" : "hidden";
	const offersStatus: ReadStatus =
		teamOffers.status === "hidden" ? ownOffersStatus : teamOffers.status;
	const offStatus = statusOfBoth(leaveOff.status, daysOff.status);
	const offToday = peopleOffOn(
		today,
		leaveOff.status === "ready" ? leaveOff.items : [],
		rowsOf(daysOff)
	);

	const shortShiftRows =
		shortShifts.status === "ready"
			? shortShifts.data.unstaffable.length + shortShifts.data.gaps.length
			: 0;
	const judged: Record<HomeSection, [ReadStatus, number]> = {
		"short-shifts": [shortShifts.status, shortShiftRows],
		"leave-to-decide": [pendingLeave.status, pendingRows.length],
		"waiting-approvals": [
			waitingApprovals.status,
			rowsOf(waitingApprovals).length,
		],
		"next-roster": [nextRosterStatus, rowsOf(toDo).length],
		"cover-offers": [offersStatus, offers],
		"off-today": [offStatus, offToday],
		"people-events": [peopleEvents.status, rowsOf(peopleEvents).length],
	};
	const states = Object.fromEntries(
		HOME_SECTIONS.map((section) => [
			section,
			shown(section) ? sectionStateOf(...judged[section]) : "hidden",
		])
	) as Record<HomeSection, SectionState>;

	return {
		comingMonday,
		shortShifts,
		pendingLeave,
		waitingApprovals,
		rostersToDo: toDo,
		teamOffers,
		myOffers,
		peopleEvents,
		states,
		counts: {
			"short-shifts": rowsOf(shortages).length,
			"leave-to-decide":
				pendingLeave.status === "ready" ? pendingLeave.total : 0,
			"waiting-approvals": rowsOf(waitingApprovals).length,
			"next-roster": rowsOf(toDo).length,
			"cover-offers": offers,
			"off-today": offToday,
		},
	};
};
