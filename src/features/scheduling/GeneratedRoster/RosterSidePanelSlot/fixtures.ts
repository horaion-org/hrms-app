import type { RosterSidePanelSlotProps } from "@/features/scheduling/GeneratedRoster/RosterSidePanelSlot/RosterSidePanelSlot";
import type { RosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { rosterViewOf } from "@/features/scheduling/roster/rosterView";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";

/** Schedule s-1's roster, as the panel slot reads it, viewed as `view` (read-only unless `editable`). */
export const slotRosterFixture = (
	view: RosterSearch,
	editable = false
): RosterSidePanelSlotProps["roster"] =>
	rosterViewOf({
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		assignments: scheduleAssignmentsFixture(),
		view: { week: "2026-10-12", ...view },
		today: "2026-10-14",
		shifts: [],
		constraints: [],
		membersWithChangedStart: 0,
		hasDetails: false,
		hasApproval: false,
		editable,
		withSummary: true,
		changesLeave: false,
	});

/** Changing schedule s-1's roster by hand, before it is published. */
export const slotEditingFixture = (): NonNullable<
	RosterSidePanelSlotProps["editing"]
> => ({
	target: {
		companyId: "c-1",
		unit: { branchId: "b-1", departmentId: "d-1" },
		scheduleId: "s-1",
		runId: "r-1",
	},
	revision: 1,
	shifts: frozenShiftsFixture(),
	nonWorkingDayTypes: ["OFF", "REST"],
	notifiesMembers: false,
});
