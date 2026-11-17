import {
	decidable,
	regenerable,
	rosterEditable,
	withdrawable,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { SCHEDULE_CREATE_KEYS } from "@/features/workspace/permissionKeys";
import { departmentScope } from "@/features/workspace/scopes";
import type { Access } from "@/features/workspace/useAccess";

/** What the viewer may do on one schedule's roster page, each at the schedule's Department. */
export type RosterPagePermissions = {
	/**
	 * Change the roster's days by hand: it is generated or published with no
	 * run open, under its own key (hrms-backend-v2 docs/adr/0062, 0063).
	 */
	mayEditShifts: boolean;
	/**
	 * Validate the roster: the same rosters as editing, but Validate writes
	 * nothing, so reading the roster is enough (hrms-backend-v2 docs/adr/0097).
	 */
	mayValidate: boolean;
	/** Reject the roster, or publish it unless its week is published elsewhere: it awaits a decision. */
	mayReject: boolean;
	/** Withdraw the roster's publication: it is published with no run open. */
	mayWithdraw: boolean;
	/** Generate the week again, unless it passed or is published elsewhere: it is regenerable. */
	mayGenerate: boolean;
	/** Read the schedule's Department's rosters: the week's other parts, its month and where people started. */
	mayRead: boolean;
	/** Create a schedule at the Department, for the days after a part. */
	mayCreateHere: boolean;
	/** Read and review leave at the Department, so the roster editor offers leave choices. */
	mayHandleLeave: boolean;
};

/** Every permission refused, while the schedule is not read yet. */
const NOTHING: RosterPagePermissions = {
	mayEditShifts: false,
	mayValidate: false,
	mayReject: false,
	mayWithdraw: false,
	mayGenerate: false,
	mayRead: false,
	mayCreateHere: false,
	mayHandleLeave: false,
};

/**
 * What the viewer may do on a schedule's roster page, from the schedule's
 * standing and the keys they hold at its Department; nothing until it is read.
 */
export const rosterPagePermissions = (
	schedule: Schedule | undefined,
	access: Pick<Access, "can" | "canAll">
): RosterPagePermissions => {
	if (!schedule) return NOTHING;
	const department = departmentScope(schedule.departmentId);
	return {
		mayEditShifts:
			rosterEditable(schedule) && access.can("schedule:edit_shift", department),
		mayValidate:
			rosterEditable(schedule) && access.can("schedule:read", department),
		mayReject:
			decidable(schedule) && access.can("schedule:publish", department),
		mayWithdraw:
			withdrawable(schedule) && access.can("schedule:publish", department),
		mayGenerate:
			regenerable(schedule) && access.can("schedule:generate", department),
		mayRead: access.can("schedule:read", department),
		mayCreateHere: access.canAll(SCHEDULE_CREATE_KEYS, department),
		mayHandleLeave: access.canAll(
			["leave_request:read", "leave_request:review"],
			department
		),
	};
};
