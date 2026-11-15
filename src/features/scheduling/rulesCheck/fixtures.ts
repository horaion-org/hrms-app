import type {
	RosterRulesCheck,
	StaffingGap,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckApi";
import { shiftCopyId } from "@/features/scheduling/shifts/fixtures";

/*
 * API-shaped Validate schedule answers for stories and tests; never sent
 * anywhere. Schedule s-1's week of 12 October.
 */

/** Front Desk AM one short on Saturday 17 October, in the shape a generation's conflicts take. */
export const staffingGapFixture = (
	overrides: Partial<StaffingGap> = {}
): StaffingGap => ({
	kind: "conflict",
	conflictId: "validated-1",
	date: "2026-10-17",
	roleUuid: "front-desk-staff",
	startBlock: 36,
	endBlock: 60,
	start: "2026-10-17T09:00",
	end: "2026-10-17T15:00",
	missing: 1,
	message:
		"Front Desk AM: got 0 of at least 1 employee with role Front Desk Staff",
	sourceRule: "shift_demand_requirement",
	sourceRuleId: null,
	shiftUuids: [shiftCopyId("front-desk-am")],
	repairRungs: ["reassign"],
	employeeUuid: null,
	...overrides,
});

/** A check with the given status, rules broken and gaps. */
export const rulesCheckFixture = (
	overrides: Partial<RosterRulesCheck> = {}
): RosterRulesCheck => ({
	status: "HOLDS",
	brokenRules: [],
	staffingGaps: [],
	...overrides,
});
