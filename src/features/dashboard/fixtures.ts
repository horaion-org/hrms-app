import type {
	DayOff,
	Overtime,
	PeopleEvent,
	Shortage,
	StaffingRule,
	TeamCoverOffer,
	WaitingApproval,
} from "@/features/dashboard/api";

/** A shift short by one on a published roster. */
export const shortageFixture = (
	overrides: Partial<Shortage> = {}
): Shortage => ({
	scheduleId: "s-1",
	scheduleStatus: "PUBLISHED",
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Sales",
	day: "2026-11-18",
	shiftId: "fs-am",
	shiftName: "Morning",
	startTime: "07:00",
	endTime: "15:00",
	shortBy: 1,
	shortSinceGeneration: 0,
	...overrides,
});

/** A person rostered off tomorrow. */
export const dayOffFixture = (overrides: Partial<DayOff> = {}): DayOff => ({
	day: "2026-11-17",
	membershipId: "ms-kent",
	displayName: "Kent Chua",
	departmentId: "d-1",
	departmentName: "Sales",
	dayTypeName: "Rest day",
	...overrides,
});

/** One department's month with one person over the ceiling. */
export const overtimeFixture = (
	overrides: Partial<Overtime> = {}
): Overtime => ({
	from: "2026-11",
	to: "2026-11",
	nearSharePercent: 80,
	departments: [
		{
			branchId: "b-1",
			branchName: "Main branch",
			departmentId: "d-1",
			departmentName: "Sales",
			month: "2026-11",
			ceilingMinutes: 72 * 60,
			overtimeMinutes: 80 * 60,
			members: [
				{
					membershipId: "ms-aisha",
					displayName: "Aisha Rahman",
					overtimeMinutes: 74 * 60,
					standing: "OVER",
				},
			],
		},
	],
	...overrides,
});

/** An offer sent to Kent that he has not answered. */
export const teamCoverOfferFixture = (
	overrides: Partial<TeamCoverOffer> = {}
): TeamCoverOffer => ({
	coverOfferId: "co-1",
	scheduleId: "s-1",
	branchId: "b-1",
	departmentId: "d-1",
	departmentName: "Sales",
	day: "2026-11-18",
	shiftId: "fs-am",
	shiftName: "Morning",
	startTime: "07:00",
	endTime: "15:00",
	membershipId: "ms-kent",
	displayName: "Kent Chua",
	sentAt: "2026-11-16T09:00:00Z",
	expiresAt: "2026-11-17T09:00:00Z",
	...overrides,
});

/** Sales' leave request, waiting at the first of two steps since Monday. */
export const waitingApprovalFixture = (
	overrides: Partial<WaitingApproval> = {}
): WaitingApproval => ({
	approvalInstanceId: "ai-1",
	subjectType: "LEAVE_REQUEST",
	subjectId: "lr-9",
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Sales",
	memberDisplayName: "Kent Tan",
	currentStepOrder: 1,
	stepCount: 2,
	waitingSince: "2026-11-16T01:00:00Z",
	stalled: false,
	...overrides,
});

/** Aisha's probation ends on 20 November. */
export const peopleEventFixture = (
	overrides: Partial<PeopleEvent> = {}
): PeopleEvent => ({
	kind: "PROBATION_ENDS",
	day: "2026-11-20",
	membershipId: "ms-aisha",
	displayName: "Aisha Rahman",
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Sales",
	...overrides,
});

/** Front desk's rule: 3 needed on each shift, 2 people hold the titles. */
export const staffingRuleFixture = (
	overrides: Partial<StaffingRule> = {}
): StaffingRule => ({
	departmentId: "d-1",
	departmentName: "Front desk",
	branchName: "Main branch",
	ruleName: "Front desk AM",
	ruleType: "SHIFT_STAFFING",
	headcount: 3,
	jobTitles: [
		{ jobTitleId: "jt-clerk", name: "Clerk" },
		{ jobTitleId: "jt-lead", name: "Lead" },
	],
	peopleWithTitles: 2,
	shifts: [{ shiftId: "sh-am", name: "Morning", daysAWeek: 7 }],
	gapsInRange: 9,
	neededShiftDaysAWeek: 21,
	holderDaysAWeek: 10,
	...overrides,
});
