import { useEffect } from "react";
import type { CoverGapRequest } from "@/features/scheduling/cover/api";
import {
	checkedGapKeys,
	gapIssueKey,
} from "@/features/scheduling/roster/rosterIssueGroups";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import type { ValidationStanding } from "@/features/scheduling/rulesCheck/issuesFromValidation";
import type { LastValidation } from "@/features/scheduling/rulesCheck/useRosterRulesCheck";

/**
 * The gaps the rules check for the roster's revision found, by shift and day
 * (`gapIssueKey`): a shift it does not list is staffed, whatever else counts
 * it short. None while no check is current or it did not work them out. An
 * open gap (`view.cover`) the current check does not list closes, as a
 * filled one does.
 */
export const useCheckedGaps = ({
	standing,
	last,
	coverGap,
	view,
	onViewChange,
}: {
	standing: ValidationStanding;
	last: LastValidation | undefined;
	coverGap: CoverGapRequest | undefined;
	view: RosterSearch;
	onViewChange: (view: RosterSearch) => void;
}): ReadonlySet<string> | undefined => {
	const checkedGaps =
		standing === "current" && last
			? checkedGapKeys(last.check.staffingGaps)
			: undefined;
	const coverGapStaffed =
		coverGap !== undefined &&
		checkedGaps !== undefined &&
		!checkedGaps.has(gapIssueKey(coverGap.shiftId, coverGap.day) ?? "");
	useEffect(() => {
		if (coverGapStaffed) onViewChange({ ...view, cover: undefined });
	}, [coverGapStaffed, view, onViewChange]);
	return checkedGaps;
};
