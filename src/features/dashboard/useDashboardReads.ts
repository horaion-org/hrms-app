import { useQuery } from "@tanstack/react-query";
import {
	daysOffQuery,
	overtimeQuery,
	shortagesQuery,
	teamCoverOffersQuery,
	type DayOff,
	type DayRange,
	type MonthSpan,
	type Overtime,
	type Shortage,
	type TeamCoverOffer,
} from "@/features/dashboard/api";
import {
	guardedRead,
	type GuardedRead,
} from "@/features/dashboard/guardedRead";
import {
	nextRosterRows,
	type NextRosterRow,
} from "@/features/dashboard/nextRoster";
import {
	myCoverOffersQuery,
	type CoverOffer,
} from "@/features/scheduling/coverOffers/api";
import { scheduleMonthSummariesQuery } from "@/features/scheduling/months/api";
import { useSchedulingReadiness } from "@/features/scheduling/readiness/useSchedulingReadiness";
import {
	SCHEDULE_EDIT_SHIFT_KEYS,
	SCHEDULE_READ_KEYS,
} from "@/features/workspace/permissionKeys";
import type { UnitSelection } from "@/features/workspace/unitSearch";
import { useAccess } from "@/features/workspace/useAccess";

/** The shifts short in the range, where `schedule:read` is held. */
export const useShortages = (
	companyId: string,
	units: UnitSelection,
	range: DayRange
): GuardedRead<Array<Shortage>> => {
	const access = useAccess();
	const allowed = access.canAny(SCHEDULE_READ_KEYS, "anywhere");
	const query = useQuery(shortagesQuery(companyId, units, range, allowed));
	return guardedRead(access, allowed, query);
};

/** The rostered days off in the range, where `schedule:read` is held. */
export const useDaysOff = (
	companyId: string,
	units: UnitSelection,
	range: DayRange
): GuardedRead<Array<DayOff>> => {
	const access = useAccess();
	const allowed = access.canAny(SCHEDULE_READ_KEYS, "anywhere");
	const query = useQuery(daysOffQuery(companyId, units, range, allowed));
	return guardedRead(access, allowed, query);
};

/** Overtime by department and month, where `schedule:read` is held; `asked` false asks for nothing. */
export const useOvertime = (
	companyId: string,
	units: UnitSelection,
	span: MonthSpan,
	asked = true
): GuardedRead<Overtime> => {
	const access = useAccess();
	const allowed = access.canAny(SCHEDULE_READ_KEYS, "anywhere");
	const query = useQuery(
		overtimeQuery(companyId, units, span, allowed && asked)
	);
	return guardedRead(access, allowed, query);
};

/** The open cover offers in the units, where `schedule:edit_shift` is held. */
export const useTeamCoverOffers = (
	companyId: string,
	units: UnitSelection
): GuardedRead<Array<TeamCoverOffer>> => {
	const access = useAccess();
	const allowed = access.canAny(SCHEDULE_EDIT_SHIFT_KEYS, "anywhere");
	const query = useQuery(teamCoverOffersQuery(companyId, units, allowed));
	return guardedRead(access, allowed, query);
};

/**
 * The person's own offers still waiting on their answer. Their own read
 * needs nothing granted, so it never consults the workspace.
 */
export const useMyOpenCoverOffers = (
	companyId: string
): GuardedRead<Array<CoverOffer>> => {
	const query = useQuery(myCoverOffersQuery(companyId));
	return guardedRead({ status: "ready" }, true, {
		...query,
		data: query.data?.filter((offer) => offer.status === "OPEN"),
	});
};

/**
 * Each Department's coming week and its step: the month summaries this
 * month and next, where `schedule:read` is held, with readiness where
 * schedules may be created (without it, the weeks alone).
 */
export const useNextRoster = (
	companyId: string,
	units: UnitSelection,
	months: MonthSpan,
	comingMonday: string
): GuardedRead<Array<NextRosterRow>> => {
	const access = useAccess();
	const allowed = access.canAny(SCHEDULE_READ_KEYS, "anywhere");
	const summaries = useQuery(
		scheduleMonthSummariesQuery(companyId, units, months, allowed)
	);
	const readiness = useSchedulingReadiness(companyId, units);
	const weeks = guardedRead(access, allowed, summaries);
	if (weeks.status !== "ready") return weeks;
	if (readiness.status === "pending") return { status: "pending" };
	return {
		status: "ready",
		data: nextRosterRows(
			weeks.data,
			readiness.status === "ready" ? readiness.rows : [],
			comingMonday
		),
	};
};
