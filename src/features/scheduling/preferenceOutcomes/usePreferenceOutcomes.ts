import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DepartmentPath } from "@/common/companyPath";
import {
	myRosterPreferenceOutcomesQuery,
	rosterPreferenceOutcomesQuery,
} from "@/features/scheduling/preferenceOutcomes/api";
import {
	outcomesByMemberDay,
	type PreferenceOutcomeLookup,
} from "@/features/shiftPreferences/preferenceOutcome";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/*
 * The outcomes are a quiet extra on the roster: until they are read, and if
 * they cannot be, the cell panel simply shows no preference row.
 */

/**
 * A roster's outcomes by person and day, read as `useRosterHours` reads the
 * hours: a hand change moves the revision, so they are read again. Undefined
 * while loading, without `schedule:read` at the Department, or on failure.
 */
export const useRosterPreferenceOutcomes = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	runId: string | null | undefined,
	revision: number
): PreferenceOutcomeLookup | undefined => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("schedule:read", departmentScope(unit.departmentId));
	const query = useQuery(
		rosterPreferenceOutcomesQuery(
			companyId,
			unit,
			scheduleId,
			runId ?? null,
			revision,
			allowed && runId !== undefined
		)
	);
	return useMemo(
		() => query.data && outcomesByMemberDay(query.data.preferences),
		[query.data]
	);
};

/** The caller's own outcomes on a published roster they are on; undefined until read, or on failure. */
export const useMyRosterPreferenceOutcomes = (
	companyId: string,
	scheduleId: string
): PreferenceOutcomeLookup | undefined => {
	const query = useQuery(
		myRosterPreferenceOutcomesQuery(companyId, scheduleId)
	);
	return useMemo(
		() => query.data && outcomesByMemberDay(query.data.preferences),
		[query.data]
	);
};
