import type { ManagedLeaveDuration } from "@/features/leaveDurations/api";

/** A managed leave duration for tests and stories; override what the case needs. */
export const managedLeaveDurationFixture = (
	overrides: Partial<ManagedLeaveDuration> = {}
): ManagedLeaveDuration => ({
	leaveDurationId: "ld-morning",
	name: "Morning",
	startTime: "09:00",
	endTime: "13:00",
	minutes: 240,
	status: "ACTIVE",
	displayOrder: 1,
	appliesToBranches: [],
	appliesToDepartments: [],
	canEdit: true,
	...overrides,
});

/** Kitchen, in Orchard, as a duration's reach names it. */
export const KITCHEN_REACH = {
	departmentId: "d-kitchen",
	departmentName: "Kitchen",
	branchId: "b-orchard",
	branchName: "Orchard",
};

/**
 * Three durations as a Kitchen admin sees them: the whole company's morning
 * (theirs to read, not to change), Kitchen's own prep, switched off, and a
 * night one for the Orchard branch.
 */
export const LEAVE_DURATION_CATALOGUE_FIXTURE: Array<ManagedLeaveDuration> = [
	managedLeaveDurationFixture({ canEdit: false }),
	managedLeaveDurationFixture({
		leaveDurationId: "ld-prep",
		name: "Early prep",
		startTime: "06:00",
		endTime: "08:30",
		minutes: 150,
		status: "INACTIVE",
		displayOrder: 2,
		appliesToDepartments: [KITCHEN_REACH],
	}),
	managedLeaveDurationFixture({
		leaveDurationId: "ld-night",
		name: "Late night",
		startTime: "22:00",
		endTime: "02:00",
		minutes: 240,
		displayOrder: 3,
		appliesToBranches: [{ branchId: "b-orchard", branchName: "Orchard" }],
		canEdit: false,
	}),
];
