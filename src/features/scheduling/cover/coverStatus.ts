import type { CoverOptions } from "@/features/scheduling/cover/api";
import type { EngineRepairState } from "@/features/scheduling/cover/useEngineRepair";
import {
	rosterChangeRefusal,
	type RosterChangeRefusal,
} from "@/features/scheduling/rosterChanges/rosterChangeRefusal";

/*
 * Where Find cover's list stands, pure: from the hours-based list's query,
 * and whether the gap is closed, which the engine's answer decides once it
 * has one.
 */

/** Where the list stands: what the panel shows in place of the options. */
export type CoverPanelStatus =
	| "loading"
	| "rosterMoved"
	| "notEditable"
	| "failed"
	| "closed"
	| "nobody"
	| "options";

/** The list's refusals that have a status of their own; any other refusal is a plain failure. */
const REFUSAL_STATUSES: Partial<Record<RosterChangeRefusal, CoverPanelStatus>> =
	{ revision: "rosterMoved", notEditable: "notEditable" };

/**
 * Whether the gap is closed. The engine's answer for the roster's revision
 * says so when it worked out what is short (`shortNow`): closed only when
 * nothing is. Under a refusal, or when the engine could not say, the
 * backend list's count decides; while the engine works, it is not closed yet.
 */
const gapClosed = (
	options: CoverOptions,
	engineRepair: EngineRepairState
): boolean => {
	if (engineRepair.status === "loading") return false;
	if (engineRepair.status === "ready" && engineRepair.shortNow !== null)
		return engineRepair.shortNow.length === 0;
	return options.gap.shortBy === 0;
};

/** Where the list stands, from its query and whether the gap is closed. */
export const coverPanelStatus = (
	query: { isPending: boolean; error: Error | null },
	options: CoverOptions | undefined,
	engineRepair: EngineRepairState
): CoverPanelStatus => {
	if (query.error)
		return REFUSAL_STATUSES[rosterChangeRefusal(query.error)] ?? "failed";
	if (!options || query.isPending) return "loading";
	if (gapClosed(options, engineRepair)) return "closed";
	return options.options.length === 0 ? "nobody" : "options";
};
