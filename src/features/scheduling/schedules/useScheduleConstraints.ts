import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { constraintsQuery } from "@/features/scheduling/constraints/api";
import {
	isFrozen,
	type Constraint,
	type SavedSchedule,
} from "@/features/scheduling/scheduleDraft";
import { scheduleConstraintsQuery } from "@/features/scheduling/schedules/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * A schedule's constraints as the Constraints step shows them: for a draft,
 * every live constraint of its Department, inactive ones included, which the
 * draft ticks by id; once generated, its frozen copies. `hidden` when
 * `constraint:read` isn't held at its Department, whether the workspace says so
 * up front or the API refuses with a 403.
 */
export type ConstraintList =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; items: Array<Constraint> };

/** `saved` undefined asks for nothing and stays pending. */
export const useScheduleConstraints = (
	companyId: string,
	saved: SavedSchedule | undefined
): ConstraintList => {
	const access = useAccess();
	const allowed =
		saved !== undefined &&
		access.can("constraint:read", departmentScope(saved.departmentId));
	const frozen = saved !== undefined && isFrozen(saved);
	const live = useQuery(constraintsQuery(companyId, saved, allowed && !frozen));
	const copies = useQuery(
		scheduleConstraintsQuery(
			companyId,
			saved,
			saved?.scheduleId ?? "",
			allowed && frozen
		)
	);
	const list = frozen ? copies : live;

	if (access.status !== "ready") return { status: access.status };
	if (saved === undefined) return { status: "pending" };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", items: list.data };
};
