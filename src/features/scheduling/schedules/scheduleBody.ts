import type { ScheduleSetup } from "@/features/scheduling/scheduleDraft";
import type {
	Schedule,
	ScheduleBody,
} from "@/features/scheduling/schedules/api";
import { coversPartOfWeek } from "@/features/scheduling/schedules/partLines";

/** What a saved draft keeps through a save that does not show it: its chosen people and the days of its week it covers. */
export type SavedDraftKeeps = Pick<
	Schedule,
	"periodStart" | "periodEnd" | "coveredFrom" | "coveredTo" | "memberProfileIds"
>;

/**
 * What saving a week's draft sends: its setup and the ticked shifts and
 * constraints, each the whole set. A save replaces the draft, and an absent
 * `memberProfileIds` means everyone (API ADR-0136), so the saved draft's
 * chosen people go along; so do its covered days while Setup keeps its week.
 */
export const scheduleBodyOf = (
	setup: ScheduleSetup,
	includedShiftIds: Array<string>,
	includedConstraintIds: Array<string>,
	savedDraft?: SavedDraftKeeps
): ScheduleBody => {
	const keepsCoveredDays =
		savedDraft !== undefined &&
		savedDraft.periodStart === setup.periodStart &&
		coversPartOfWeek(savedDraft);
	return {
		name: setup.name,
		periodStart: setup.periodStart,
		...(keepsCoveredDays
			? { coveredFrom: savedDraft.coveredFrom, coveredTo: savedDraft.coveredTo }
			: {}),
		includeLeave: setup.includeLeave,
		includedShiftIds,
		includedConstraintIds,
		...(savedDraft?.memberProfileIds
			? { memberProfileIds: savedDraft.memberProfileIds }
			: {}),
	};
};
