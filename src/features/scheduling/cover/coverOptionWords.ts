import type { TFunction } from "i18next";
import type { CoverUnavailableReason } from "@/features/scheduling/cover/api";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

/*
 * The hours-based cover list's words, pure: the API sends codes, and the app
 * writes every line (ADR-0003).
 */

const key = "scheduling.cover";

/** What the list says of a shift; roles only when the schedule's frozen shifts could be read. */
export type CoverShift = Pick<
	ScheduleShift,
	"name" | "startTime" | "endTime"
> & {
	roles?: ScheduleShift["roles"];
};

/** The shift's roles as one phrase: "Front Desk Staff or Front Desk Lead". */
const jobTitlesOf = (shift: CoverShift | undefined, t: TFunction): string =>
	t("scheduling.constraints.listOr", {
		items: (shift?.roles ?? []).map((role) => role.name),
	});

/** Why someone can't cover the shift, in a few words. */
export const reasonText = (
	reason: CoverUnavailableReason,
	shift: CoverShift | undefined,
	t: TFunction
): string => t(`${key}.reason.${reason}`, { jobTitles: jobTitlesOf(shift, t) });
