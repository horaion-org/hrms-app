import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	repairOptionsQuery,
	type RepairOption,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	optionsInOrder,
	repairRefusalOf,
	type RepairRefusal,
} from "@/features/scheduling/cover/engineRepairWords";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/** Where the engine's section stands: not asked yet, asking, answered, or refused with why. */
export type EngineRepairState =
	| { status: "idle" | "loading" }
	| { status: "ready"; options: Array<RepairOption> }
	| { status: "refused"; refusal: RepairRefusal };

/**
 * The engine's options for one gap, asked for on demand: nothing is sent until
 * `ask`, since the engine runs a solver. Asking again after a refusal sends
 * again. An ask holds for the revision it was made at: once the roster moves
 * (a change applied), the section is unasked again rather than solving anew
 * unasked; while a change lands (`landing`) nothing is asked. The options come
 * feasible first.
 */
export const useEngineRepair = (
	target: RosterChangeTarget,
	gap: CoverGapRequest,
	revision: number,
	landing: boolean
): EngineRepairState & { ask: () => void } => {
	const [askedAt, setAskedAt] = useState<number>();
	const asked = askedAt === revision;
	// Not asked again while a change lands: the revision it was asked at is passing.
	const query = useQuery({
		...repairOptionsQuery(target, gap, revision, asked),
		enabled: !landing,
	});
	const ask = (): void => {
		if (asked) void query.refetch();
		else setAskedAt(revision);
	};

	if (!asked) return { status: "idle", ask };
	if (query.isError)
		return { status: "refused", refusal: repairRefusalOf(query.error), ask };
	if (query.data === undefined || query.isFetching)
		return { status: "loading", ask };
	return { status: "ready", options: optionsInOrder(query.data.options), ask };
};
