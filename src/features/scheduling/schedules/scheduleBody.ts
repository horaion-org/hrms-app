import type { ScheduleSetup } from "@/features/scheduling/scheduleDraft";
import type { ScheduleBody } from "@/features/scheduling/schedules/api";

/** What saving a week's draft sends: its setup and the ticked shifts and constraints, each the whole set. */
export const scheduleBodyOf = (
	setup: ScheduleSetup,
	includedShiftIds: Array<string>,
	includedConstraintIds: Array<string>
): ScheduleBody => ({
	name: setup.name,
	periodStart: setup.periodStart,
	includeLeave: setup.includeLeave,
	includedShiftIds,
	includedConstraintIds,
});
