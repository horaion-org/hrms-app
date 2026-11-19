import { useQuery } from "@tanstack/react-query";
import type {
	DayRange,
	MonthSpan,
	Overtime,
	Shortage,
	StaffingRule,
} from "@/features/dashboard/api";
import {
	guardedRead,
	type GuardedRead,
} from "@/features/dashboard/guardedRead";
import {
	reportOvertimeQuery,
	reportShortagesQuery,
	reportStaffingQuery,
	rosterChangesQuery,
	type RosterChangeDepartment,
} from "@/features/reports/api";
import { REPORT_READ_KEYS } from "@/features/workspace/permissionKeys";
import type { UnitSelection } from "@/features/workspace/unitSearch";
import { useAccess } from "@/features/workspace/useAccess";

/*
 * Reports' reads, each offered where `report:read` is held, at any scope,
 * and nowhere else: holding `schedule:read` alone asks for nothing here.
 */

/** The shifts short in the range, where `report:read` is held; `asked` false asks for nothing. */
export const useReportShortages = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	asked: boolean
): GuardedRead<Array<Shortage>> => {
	const access = useAccess();
	const allowed = access.canAny(REPORT_READ_KEYS, "anywhere");
	const query = useQuery(
		reportShortagesQuery(companyId, units, range, allowed && asked)
	);
	return guardedRead(access, allowed, query);
};

/** Staffing by rule, where `report:read` is held; `asked` false asks for nothing. */
export const useReportStaffing = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	asked: boolean
): GuardedRead<Array<StaffingRule>> => {
	const access = useAccess();
	const allowed = access.canAny(REPORT_READ_KEYS, "anywhere");
	const query = useQuery(
		reportStaffingQuery(companyId, units, range, allowed && asked)
	);
	return guardedRead(access, allowed, query);
};

/** Overtime by department and month, where `report:read` is held; `asked` false asks for nothing. */
export const useReportOvertime = (
	companyId: string,
	units: UnitSelection,
	span: MonthSpan,
	asked: boolean
): GuardedRead<Overtime> => {
	const access = useAccess();
	const allowed = access.canAny(REPORT_READ_KEYS, "anywhere");
	const query = useQuery(
		reportOvertimeQuery(companyId, units, span, allowed && asked)
	);
	return guardedRead(access, allowed, query);
};

/** Changes to published rosters, where `report:read` is held; `asked` false asks for nothing. */
export const useRosterChanges = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	asked: boolean
): GuardedRead<Array<RosterChangeDepartment>> => {
	const access = useAccess();
	const allowed = access.canAny(REPORT_READ_KEYS, "anywhere");
	const query = useQuery(
		rosterChangesQuery(companyId, units, range, allowed && asked)
	);
	return guardedRead(access, allowed, query);
};
