import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { DepartmentPath } from "@/features/scheduling/paths";
import { shiftsQuery, type Shift } from "@/features/scheduling/shifts/api";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";
import { useCanAnywhere } from "@/features/workspace/useCan";

/**
 * A schedule's shifts. `hidden` when the person's grants don't reach shifts
 * anywhere, whether the workspace says so up front or the API refuses with
 * a 403.
 */
export type ShiftList =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; items: Array<Shift> };

/** `unit` or `scheduleId` undefined, or `wanted` false, asks for nothing and stays pending. */
export const useShifts = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string | undefined,
	wanted = true
): ShiftList => {
	const workspace = useQuery({ ...workspaceQuery, retry });
	const allowed = useCanAnywhere()(["shift:read"]);
	const list = useQuery(
		shiftsQuery(
			companyId,
			unit,
			scheduleId ?? "",
			allowed && wanted && scheduleId !== undefined
		)
	);

	if (workspace.isPending) return { status: "pending" };
	if (workspace.isError) return { status: "error" };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", items: list.data };
};
