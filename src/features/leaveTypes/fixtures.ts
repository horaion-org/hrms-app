import type { ManagedLeaveType } from "@/features/leaveTypes/api";

/** A managed leave type for tests and stories; override what the case needs. */
export const managedLeaveTypeFixture = (
	overrides: Partial<ManagedLeaveType> = {}
): ManagedLeaveType => ({
	leaveTypeId: "lt-annual",
	code: "ANNUAL",
	name: "Annual leave",
	grantKind: "ALLOWANCE",
	paid: true,
	requiresReason: false,
	status: "ACTIVE",
	displayOrder: 1,
	system: false,
	requestCount: 0,
	...overrides,
});

/** A small catalogue: two yearly types, one per occasion, an inactive one and the day off. */
export const LEAVE_TYPE_CATALOGUE_FIXTURE: Array<ManagedLeaveType> = [
	managedLeaveTypeFixture({ requestCount: 12 }),
	managedLeaveTypeFixture({
		leaveTypeId: "lt-sick",
		code: "SICK",
		name: "Sick leave",
		displayOrder: 2,
		requestCount: 3,
	}),
	managedLeaveTypeFixture({
		leaveTypeId: "lt-marriage",
		code: "MARRIAGE",
		name: "Marriage leave",
		grantKind: "PER_OCCASION",
		displayOrder: 1,
	}),
	managedLeaveTypeFixture({
		leaveTypeId: "lt-study",
		code: "STUDY_LEAVE",
		name: "Study leave",
		grantKind: "UNTRACKED",
		paid: false,
		requiresReason: true,
		status: "INACTIVE",
		displayOrder: 1,
		requestCount: 2,
	}),
	managedLeaveTypeFixture({
		leaveTypeId: "lt-off",
		code: "OFF",
		name: "Day off",
		grantKind: "UNTRACKED",
		displayOrder: 1,
		system: true,
	}),
];
