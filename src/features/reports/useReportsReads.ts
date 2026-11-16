import { useQuery } from "@tanstack/react-query";
import type { DayRange } from "@/features/dashboard/api";
import {
	guardedRead,
	type GuardedRead,
} from "@/features/dashboard/guardedRead";
import {
	rosterChangesQuery,
	type RosterChangeDepartment,
} from "@/features/reports/api";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import type { UnitSelection } from "@/features/workspace/unitSearch";
import { useAccess } from "@/features/workspace/useAccess";

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
