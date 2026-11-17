import type { DepartmentPath } from "@/common/companyPath";
import {
	fixLinkOf,
	type CanFix,
	type Gate,
	type ReturnTo,
	type SetupView,
} from "@/features/scheduling/readiness/readinessCopy";
import type { FixLink } from "@/features/scheduling/readiness/ReadinessGateCallout";
import type { SetupLink } from "@/features/scheduling/WeekChoiceSummary";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

/*
 * Where a wizard's Setup and Generate steps send the person to change the
 * Department's shifts and constraints, and what they may fix there. Both
 * wizards decide this the same way; the API stays the access control.
 */

/** The Department's setup tabs a wizard step links to, and the gate's fix link. */
export type SetupLinks = {
	/** Opens the Shifts tab on the Department; none without `shift:read` there. */
	editShifts: SetupLink | undefined;
	/** Opens the Constraints tab on the Department; none without `constraint:read` there. */
	editConstraints: SetupLink | undefined;
	/** Whether the person may add what the Department lacks there. */
	canFix: CanFix;
	/** The tab that fixes the gate, carrying the way back; none where that tab may not be read. */
	fixLink: (gate: Gate, returnTo: ReturnTo) => FixLink | undefined;
};

/** The permission that reads each setup tab. */
const READ_KEY_OF: Record<SetupView, PermissionKey> = {
	shifts: "shift:read",
	constraints: "constraint:read",
};

/**
 * The setup links of the Department in `unit`, for a person who holds the
 * keys `can` answers yes to at that Department. Without a Department there is
 * nothing to link to or fix.
 */
export const setupLinksOf = (
	unit: DepartmentPath | undefined,
	can: (key: PermissionKey) => boolean
): SetupLinks => {
	const editLink = (view: SetupView): SetupLink | undefined =>
		unit && can(READ_KEY_OF[view])
			? {
					to: "/scheduling",
					search: {
						view,
						branch: unit.branchId,
						department: unit.departmentId,
					},
				}
			: undefined;
	const editShifts = editLink("shifts");
	const editConstraints = editLink("constraints");
	const fixLink = (gate: Gate, returnTo: ReturnTo): FixLink | undefined =>
		gate.linkTo &&
		unit &&
		(gate.linkTo === "shifts" ? editShifts : editConstraints)
			? { to: "/scheduling", search: fixLinkOf(gate.linkTo, unit, returnTo) }
			: undefined;
	return {
		editShifts,
		editConstraints,
		canFix: {
			shifts: unit !== undefined && can("shift:create"),
			constraints: unit !== undefined && can("constraint:create"),
		},
		fixLink,
	};
};
