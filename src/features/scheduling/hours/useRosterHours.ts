import { useQuery } from "@tanstack/react-query";
import type { DepartmentPath } from "@/common/companyPath";
import { ApiProblemError } from "@/common/problem";
import {
	rosterHoursQuery,
	type RosterHours,
} from "@/features/scheduling/hours/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * A roster's hours by person. `hidden` when `schedule:read` isn't held at its
 * Department, whether the workspace says so up front or the API refuses with
 * a 403, and when the roster has no hours to show.
 */
export type RosterHoursState =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; hours: RosterHours };

/**
 * The hours of run `runId` at `revision`, read as `useScheduleAssignments`
 * reads the rows: a hand change moves the revision, so they are read again.
 * `shown` false (the roster has no hours in the ledger) asks for nothing.
 */
export const useRosterHours = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	runId: string | null | undefined,
	revision: number,
	shown: boolean
): RosterHoursState => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("schedule:read", departmentScope(unit.departmentId));
	const query = useQuery(
		rosterHoursQuery(
			companyId,
			unit,
			scheduleId,
			runId ?? null,
			revision,
			allowed && shown && runId !== undefined
		)
	);

	if (access.status !== "ready") return { status: access.status };
	if (!allowed || !shown) return { status: "hidden" };
	if (query.error instanceof ApiProblemError && query.error.status === 403)
		return { status: "hidden" };
	if (query.isError) return { status: "error" };
	if (query.data === undefined) return { status: "pending" };
	return { status: "ready", hours: query.data };
};
