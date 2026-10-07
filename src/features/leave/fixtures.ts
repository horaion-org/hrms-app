import type { LeaveRequest } from "@/features/leave/api";

/** One request as the API answers it, for stories and tests; never sent anywhere. */
export const leaveFixture = (
	overrides: Partial<LeaveRequest> & Pick<LeaveRequest, "leaveRequestId">
): LeaveRequest => ({
	membershipId: "m-aisha",
	employeeCode: "EMP-10517",
	displayName: "Aisha Rahman",
	branchId: "b-1",
	branchName: "Main branch",
	branchCountry: "SG",
	departmentId: "d-1",
	departmentName: "Sales",
	leaveType: "ANNUAL",
	startDate: "2026-05-22",
	endDate: "2026-05-22",
	workingDays: 1,
	status: "PENDING",
	requestedAt: "2026-05-02T08:00:00Z",
	requestedBy: { membershipId: "m-owner", displayName: "Moses Lee" },
	reviewedAt: null,
	reviewedBy: null,
	rejectionReason: null,
	...overrides,
});

/** A Singapore branch's May 2026 requests: pending, approved and rejected, three people. */
export const LEAVE_FIXTURES: Array<LeaveRequest> = [
	leaveFixture({ leaveRequestId: "leave-aisha" }),
	leaveFixture({
		leaveRequestId: "leave-cheryl",
		membershipId: "m-cheryl",
		employeeCode: "EMP-10620",
		displayName: "Cheryl Ng",
		leaveType: "SICK",
		startDate: "2026-05-20",
		endDate: "2026-05-21",
		workingDays: 2,
		requestedAt: "2026-05-18T02:30:00Z",
	}),
	leaveFixture({
		leaveRequestId: "leave-faris",
		membershipId: "m-faris",
		employeeCode: "EMP-10488",
		displayName: "Faris Ahmad",
		leaveType: "UNPAID",
		startDate: "2026-05-25",
		endDate: "2026-05-29",
		workingDays: 5,
		status: "REJECTED",
		requestedAt: "2026-05-10T01:00:00Z",
		reviewedAt: "2026-05-11T04:00:00Z",
		reviewedBy: { membershipId: "m-owner", displayName: "Moses Lee" },
		rejectionReason: "Coverage needed for the team event.",
	}),
	leaveFixture({
		leaveRequestId: "leave-moses",
		membershipId: "m-owner",
		employeeCode: "EMP-10482",
		displayName: "Moses Lee",
		leaveType: "ANNUAL",
		startDate: "2026-06-16",
		endDate: "2026-06-18",
		workingDays: 3,
		status: "APPROVED",
		requestedAt: "2026-05-10T03:12:00Z",
		reviewedAt: "2026-05-10T08:00:00Z",
		reviewedBy: { membershipId: "m-hr", displayName: "Priya Nair" },
	}),
];

/** The window the fixtures fall in, for stories and tests. */
export const FIXTURE_RANGE = { start: "2026-05-18", end: "2026-06-14" };
