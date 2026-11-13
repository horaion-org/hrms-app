import type {
	CompanyLeaveType,
	LeaveDurationOption,
	LeaveRequest,
} from "@/features/leave/api";

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
	branchTimeZone: "Asia/Singapore",
	departmentId: "d-1",
	departmentName: "Sales",
	leaveType: "ANNUAL",
	leaveTypeId: "lt-annual",
	leaveTypeName: "Annual leave",
	startDate: "2026-05-22",
	endDate: "2026-05-22",
	workingDays: 1,
	durationName: null,
	startTime: null,
	endTime: null,
	leaveMinutes: null,
	notes: null,
	status: "PENDING",
	requestedAt: "2026-05-02T08:00:00Z",
	requestedBy: { membershipId: "m-owner", displayName: "Moses Lee" },
	reviewedAt: null,
	reviewedBy: null,
	rejectionReason: null,
	approvalComment: null,
	approval: null,
	rejectedAtStep: null,
	...overrides,
});

/** Aisha's request under the company's leave flow, waiting on step `step` of 2 (Manager, then HR). */
export const leaveAtStepFixture = (step: 1 | 2): LeaveRequest =>
	leaveFixture({
		leaveRequestId: "leave-aisha",
		approval: {
			approvalInstanceId: "ai-leave",
			currentStepOrder: step,
			currentStepLabel: step === 1 ? "Manager" : "HR",
			stepCount: 2,
		},
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
		leaveTypeId: "lt-sick",
		leaveTypeName: "Sick leave",
		startDate: "2026-05-20",
		endDate: "2026-05-21",
		workingDays: 2,
		notes: "Handover notes are with Ben.\nBack on Friday.",
		requestedAt: "2026-05-18T02:30:00Z",
	}),
	leaveFixture({
		leaveRequestId: "leave-faris",
		membershipId: "m-faris",
		employeeCode: "EMP-10488",
		displayName: "Faris Ahmad",
		leaveType: "UNPAID",
		leaveTypeId: "lt-unpaid",
		leaveTypeName: "Unpaid leave",
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
		approvalComment: "Enjoy the break.",
	}),
];

/** The window the fixtures fall in, for stories and tests. */
export const FIXTURE_RANGE = { start: "2026-05-18", end: "2026-06-14" };

/** One catalogue entry as the API lists it, for stories and tests. */
export const leaveTypeFixture = (
	overrides: Partial<CompanyLeaveType> &
		Pick<CompanyLeaveType, "code" | "name" | "grantKind">
): CompanyLeaveType => ({
	leaveTypeId: `lt-${overrides.code.toLowerCase()}`,
	paid: true,
	requiresReason: false,
	status: "ACTIVE",
	displayOrder: 1,
	system: false,
	allowsPartDays: true,
	...overrides,
});

/** The default catalogue every company starts with, the scheduler's day off included. */
export const LEAVE_TYPE_FIXTURES: Array<CompanyLeaveType> = [
	leaveTypeFixture({
		code: "ANNUAL",
		name: "Annual leave",
		grantKind: "ALLOWANCE",
		displayOrder: 1,
	}),
	leaveTypeFixture({
		code: "SICK",
		name: "Sick leave",
		grantKind: "ALLOWANCE",
		displayOrder: 2,
	}),
	leaveTypeFixture({
		code: "HOSPITALISATION",
		name: "Hospitalisation leave",
		grantKind: "ALLOWANCE",
		displayOrder: 3,
	}),
	leaveTypeFixture({
		code: "CHILDCARE",
		name: "Childcare leave",
		grantKind: "ALLOWANCE",
		displayOrder: 4,
	}),
	leaveTypeFixture({
		code: "MATERNITY",
		name: "Maternity leave",
		grantKind: "PER_OCCASION",
		displayOrder: 1,
	}),
	leaveTypeFixture({
		code: "PATERNITY",
		name: "Paternity leave",
		grantKind: "PER_OCCASION",
		displayOrder: 2,
	}),
	leaveTypeFixture({
		code: "SHARED_PARENTAL",
		name: "Shared parental leave",
		grantKind: "PER_OCCASION",
		displayOrder: 3,
	}),
	leaveTypeFixture({
		code: "MARRIAGE",
		name: "Marriage leave",
		grantKind: "PER_OCCASION",
		displayOrder: 4,
	}),
	leaveTypeFixture({
		code: "COMPASSIONATE",
		name: "Compassionate leave",
		grantKind: "PER_OCCASION",
		displayOrder: 5,
	}),
	leaveTypeFixture({
		code: "OFF_IN_LIEU",
		name: "Off in lieu",
		grantKind: "UNTRACKED",
		displayOrder: 1,
	}),
	leaveTypeFixture({
		code: "UNPAID",
		name: "Unpaid leave",
		grantKind: "UNTRACKED",
		paid: false,
		displayOrder: 2,
	}),
	leaveTypeFixture({
		code: "OTHER",
		name: "Other",
		grantKind: "UNTRACKED",
		requiresReason: true,
		displayOrder: 3,
	}),
	leaveTypeFixture({
		code: "OFF",
		name: "Day off",
		grantKind: "UNTRACKED",
		displayOrder: 0,
		system: true,
	}),
];

/** Aisha's morning off on one day at a leave duration: four hours, not a day. */
export const partDayLeaveFixture = (
	overrides: Partial<LeaveRequest> = {}
): LeaveRequest =>
	leaveFixture({
		leaveRequestId: "leave-aisha-morning",
		durationName: "Morning",
		startTime: "09:00",
		endTime: "13:00",
		leaveMinutes: 240,
		...overrides,
	});

/** The leave durations a person in the Sales Department may pick: a morning and a night across midnight. */
export const LEAVE_DURATION_OPTION_FIXTURES: Array<LeaveDurationOption> = [
	{
		leaveDurationId: "ld-morning",
		name: "Morning",
		startTime: "09:00",
		endTime: "13:00",
		minutes: 240,
	},
	{
		leaveDurationId: "ld-night",
		name: "Night",
		startTime: "22:00",
		endTime: "02:00",
		minutes: 240,
	},
];
