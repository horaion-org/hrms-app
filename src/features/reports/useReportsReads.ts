import { useQuery } from "@tanstack/react-query";
import type { DayRange } from "@/features/dashboard/api";
import {
	guardedRead,
	type GuardedRead,
} from "@/features/dashboard/guardedRead";
import {
	rosterChangesQuery,
	staffingQuery,
	type RosterChangeDepartment,
	type StaffingRule,
} from "@/features/reports/api";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import type { UnitSelection } from "@/features/workspace/unitSearch";
import { useAccess } from "@/features/workspace/useAccess";

/** Staffing by rule, where `schedule:read` is held; `asked` false asks for nothing. */
export const useStaffing = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	asked: boolean
): GuardedRead<Array<StaffingRule>> => {
	const access = useAccess();
	const allowed = access.canAny(SCHEDULE_READ_KEYS, "anywhere");
	const query = useQuery(
		staffingQuery(companyId, units, range, allowed && asked)
	);
	return guardedRead(access, allowed, query);
};

/** Changes to published rosters, where `schedule:read` is held; `asked` false asks for nothing. */
export const useRosterChanges = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	asked: boolean
): GuardedRead<Array<RosterChangeDepartment>> => {
	const access = useAccess();
	const allowed = access.canAny(SCHEDULE_READ_KEYS, "anywhere");
	const query = useQuery(
		rosterChangesQuery(companyId, units, range, allowed && asked)
	);
	return guardedRead(access, allowed, query);
};
