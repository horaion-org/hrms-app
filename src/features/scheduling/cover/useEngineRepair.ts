import { useQuery } from "@tanstack/react-query";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	type NotAssignedPerson,
	repairOptionsQuery,
	type RepairOption,
} from "@/features/scheduling/cover/engineRepairApi";
import {
	optionsInOrder,
	repairRefusalOf,
	type RepairRefusal,
} from "@/features/scheduling/cover/engineRepairWords";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/** Where the engine's answer stands: asking, answered, or refused with why. */
export type EngineRepairState =
	| { status: "loading" }
	| {
			status: "ready";
			options: Array<RepairOption>;
			/** Why each person with the gap's job title was not assigned; null or left out when not known. */
			notAssigned?: Array<NotAssignedPerson> | null;
	  }
	| { status: "refused"; refusal: RepairRefusal };

/**
 * The engine's options for one gap, asked for as soon as the gap is open:
 * one ask per gap and revision, kept for a while so reopening the same gap
 * does not solve again; once the roster moves (a change applied) the next
 * revision is asked afresh. While a change lands (`landing`) nothing is
 * asked. `askAgain` sends again after a refusal. The options come feasible
 * first.
 */
export const useEngineRepair = (
	target: RosterChangeTarget,
	gap: CoverGapRequest,
	revision: number,
	landing: boolean
): EngineRepairState & { askAgain: () => void } => {
	// Not asked while a change lands: the revision it would be asked at is passing.
	const query = useQuery(repairOptionsQuery(target, gap, revision, !landing));
	const askAgain = (): void => {
		void query.refetch();
	};

	if (query.isError)
		return {
			status: "refused",
			refusal: repairRefusalOf(query.error),
			askAgain,
		};
	if (query.data === undefined || query.isFetching)
		return { status: "loading", askAgain };
	return {
		status: "ready",
		options: optionsInOrder(query.data.options),
		notAssigned: query.data.notAssigned,
		askAgain,
	};
};
