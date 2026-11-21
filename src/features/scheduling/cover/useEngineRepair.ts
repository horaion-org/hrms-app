import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	type NotAssignedPerson,
	repairOptionsQuery,
	type RepairOption,
	type RepairOptions,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	repairRefusalOf,
	type RepairRefusal,
} from "@/features/scheduling/cover/engineRepairWords";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/** Where the engine's answer stands: asking, answered, or refused with why (and whether it is being asked again). */
export type EngineRepairState =
	| { status: "loading" }
	| ({
			status: "ready";
			/** The options in the engine's order, as sent. */
			options: Array<RepairOption>;
			/** Why each person with the gap's job title was not assigned; null or left out when not known. */
			notAssigned?: Array<NotAssignedPerson> | null;
	  } & Pick<RepairOptions, "revision" | "search" | "shortNow">)
	| {
			status: "refused";
			refusal: RepairRefusal;
			/** Asked again after the refusal, and the answer not in yet: the refusal stays on screen meanwhile. */
			retrying: boolean;
	  };

/**
 * The engine's options for one gap, asked for as soon as the gap is open:
 * one ask per gap and revision, kept for a while so reopening the same gap
 * does not solve again; once the roster moves (a change applied) the next
 * revision is asked afresh. While a change lands (`landing`) nothing is
 * asked. `askAgain` sends again after a refusal; until its answer arrives the
 * refusal is kept, marked `retrying`, because a query with no answer yet
 * forgets its error as it asks again. The options come in the engine's order.
 */
export const useEngineRepair = (
	target: RosterChangeTarget,
	gap: CoverGapRequest,
	revision: number,
	landing: boolean
): EngineRepairState & { askAgain: () => void } => {
	// Not asked while a change lands: the revision it would be asked at is passing.
	const query = useQuery(repairOptionsQuery(target, gap, revision, !landing));
	const [lastRefusal, setLastRefusal] = useState<{
		revision: number;
		refusal: RepairRefusal;
	}>();
	const askAgain = (): void => {
		void query.refetch();
	};

	if (query.isError) {
		const refusal = repairRefusalOf(query.error);
		// Kept while rendering, as `useRosterRulesCheck` keeps its last answer.
		if (lastRefusal?.revision !== revision || lastRefusal.refusal !== refusal)
			setLastRefusal({ revision, refusal });
		return { status: "refused", refusal, retrying: false, askAgain };
	}
	if (
		query.data === undefined &&
		query.isFetching &&
		lastRefusal?.revision === revision
	)
		return {
			status: "refused",
			refusal: lastRefusal.refusal,
			retrying: true,
			askAgain,
		};
	if (query.data === undefined || query.isFetching)
		return { status: "loading", askAgain };
	return {
		status: "ready",
		options: query.data.options,
		notAssigned: query.data.notAssigned,
		revision: query.data.revision,
		search: query.data.search,
		shortNow: query.data.shortNow,
		askAgain,
	};
};
