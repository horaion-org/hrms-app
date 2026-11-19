import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { repairWarmUpQuery } from "@/features/scheduling/cover/repairWarmUpApi";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";

/** A target that warms nothing: no roster may be repaired here. */
const NO_TARGET: RosterChangeTarget = {
	companyId: "",
	unit: { branchId: "", departmentId: "" },
	scheduleId: "",
	runId: null,
};

/**
 * Warms the engine's repair worker for the roster once `wanted` (repair opened
 * for a gap, or Validate schedule lit up), at most once per roster in the
 * window; nothing without a `target`. Returns nothing: no spinner, no error.
 */
export const useRepairWarmUp = (
	target: RosterChangeTarget | undefined,
	revision: number,
	wanted: boolean
): void => {
	useQuery(
		repairWarmUpQuery(
			target ?? NO_TARGET,
			revision,
			target !== undefined && wanted
		)
	);
};

/**
 * Warms the worker once Validate schedule lights up (`lit`) after a hand
 * change made in this visit, as the manager is about to validate; never for
 * the roster as it was opened, so a plain page view sends nothing.
 */
export const useRepairWarmUpOnValidate = (
	target: RosterChangeTarget | undefined,
	revision: number,
	lit: boolean
): void => {
	const [openedAt, setOpenedAt] = useState<number>();
	if (openedAt === undefined && target !== undefined) setOpenedAt(revision);
	const changedThisVisit = openedAt !== undefined && revision !== openedAt;
	useRepairWarmUp(target, revision, lit && changedThisVisit);
};
