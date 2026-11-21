import type { RepairRefusal } from "@/features/scheduling/cover/engineRepairWords";
import type { EngineRepairState } from "@/features/scheduling/cover/useEngineRepair";
import type { CoverPanelStatus } from "@/features/scheduling/cover/useCoverPanel";

/*
 * Find cover's one list, pure: which list the panel shows for a short shift.
 * The list is the engine's options, on a published roster too (whose offers
 * go out from them), and the backend's people (ranked by hours, no rule
 * checked) only when the engine cannot answer.
 */

/**
 * What the cover list shows: the gap's own state (the roster moved, it can't
 * be edited, the shift is covered), the engine's options, or the backend's
 * people because the engine could not answer.
 */
export type CoverListView = "gapStatus" | "engine" | "backendFallback";

/** The backend list's states that speak for the gap itself, whichever list is shown. */
const GAP_STATUSES: ReadonlyArray<CoverPanelStatus> = [
	"rosterMoved",
	"notEditable",
	"closed",
];

/** The engine's refusals that mean it could not be reached or could not answer this time. */
const UNREACHABLE_REFUSALS: ReadonlyArray<RepairRefusal> = [
	"notConnected",
	"tooSlow",
	"failed",
];

/** Which list the panel shows, from the backend list's state and the engine's. */
export const coverListView = (
	listStatus: CoverPanelStatus,
	engineStatus: EngineRepairState["status"]
): CoverListView => {
	if (GAP_STATUSES.includes(listStatus)) return "gapStatus";
	return engineStatus === "refused" ? "backendFallback" : "engine";
};

/** Whether the backend's people are on screen, so one of them may be chosen and previewed. */
export const showsBackendList = (view: CoverListView): boolean =>
	view === "backendFallback";

/** The line for an engine refusal: one plain line when it could not be reached, else the refusal's own words. */
export const refusalLineKey = (
	refusal: RepairRefusal
):
	| "scheduling.cover.engine.unreachable"
	| `scheduling.cover.engine.refusal.${RepairRefusal}` =>
	UNREACHABLE_REFUSALS.includes(refusal)
		? "scheduling.cover.engine.unreachable"
		: `scheduling.cover.engine.refusal.${refusal}`;
