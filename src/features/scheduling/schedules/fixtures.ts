import { companyWideWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	INCLUDED_CONSTRAINT_IDS,
	constraintCopyId,
} from "@/features/scheduling/constraints/fixtures";
import type {
	AssignmentOffReason,
	GenerationFindings,
	Schedule,
	ScheduleAssignment,
	ScheduleGeneration,
	ScheduleStatus,
} from "@/features/scheduling/schedules/api";
import {
	INCLUDED_SHIFT_IDS,
	frozenShiftsFixture,
	shiftCopyId,
} from "@/features/scheduling/shifts/fixtures";
import type { Workspace } from "@/features/workspace/api";

/*
 * API-shaped schedules for stories and tests; never sent anywhere. A
 * draft of "Front Office" (d-1) of "Main branch" (b-1) ticking four of the
 * department's shifts and three of its constraints, which are read on their own
 * (`shifts/fixtures.ts`, `constraints/fixtures.ts`).
 */

/** Draft s-1; `overrides` set it apart. */
export const scheduleFixture = (
	overrides: Partial<Schedule> = {}
): Schedule => ({
	scheduleId: "s-1",
	companyId: "c-1",
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Front Office",
	timeZone: "Asia/Singapore",
	name: "Front Office - Week 42",
	periodStart: "2026-10-12",
	periodEnd: "2026-10-18",
	includeLeave: true,
	allowOpenShifts: false,
	status: "DRAFT",
	includedShiftIds: [
		"front-desk-am",
		"breakfast-prep",
		"lunch-rush",
		"swing-shift",
	],
	includedConstraintIds: [
		"lunch-stand-ins",
		"morning-cover",
		"rest-between-shifts",
	],
	generationRequestedAt: null,
	generationRequestedBy: null,
	generation: null,
	createdAt: "2026-10-08T09:00:00Z",
	updatedAt: "2026-10-08T09:00:00Z",
	...overrides,
});

/** The three members of Front Office that schedule s-1's roster and findings name. */
const ROSTER_MEMBERS = [
	{
		membershipId: "m-1",
		memberProfileId: "mp-1",
		displayName: "Aisha Rahman",
		employeeCode: "EMP-001",
		jobTitleName: "Front Desk Lead",
	},
	{
		membershipId: "m-2",
		memberProfileId: "mp-2",
		displayName: "Ben Ong",
		employeeCode: "EMP-002",
		jobTitleName: "Front Desk Staff",
	},
	{
		membershipId: "m-3",
		memberProfileId: "mp-3",
		displayName: "Chen Wei",
		employeeCode: "EMP-003",
		jobTitleName: "Duty Manager",
	},
] as const;

/** What the engine found for schedule s-1's roster: one of each kind of finding. */
export const generationFindingsFixture = (
	overrides: Partial<GenerationFindings> = {}
): GenerationFindings => ({
	scheduleStatus: "FEASIBLE",
	failureReason: null,
	generatedAt: "2026-10-09T10:01:30Z",
	errors: [
		{
			employeeId: "mp-2",
			date: "2026-10-17",
			messages: ["Ben Ong works more than five days in a row."],
		},
	],
	diagnostics: [
		{
			code: "role_without_staff",
			severity: "warning",
			audience: "configuration",
			message: "No one can work as Pastry Assistant.",
			entities: { roleUuid: "pastry-assistant", shiftUuid: null },
		},
	],
	conflicts: [
		{
			kind: "conflict",
			conflictId: "cf-1",
			date: "2026-10-17",
			roleUuid: "front-desk-staff",
			startBlock: 18,
			endBlock: 30,
			start: "09:00",
			end: "15:00",
			missing: 1,
			message: "Front Desk AM is one Front Desk Staff short.",
			sourceRule: "Morning cover",
			sourceRuleId: constraintCopyId("morning-cover"),
			shiftUuids: [shiftCopyId("front-desk-am")],
			repairRungs: ["extend_shift"],
			employeeUuid: null,
		},
	],
	assignmentMessages: [
		{
			employeeId: "mp-3",
			day: "2026-10-18",
			messages: ["Chen Wei covers the Sunday swing alone."],
		},
	],
	members: ROSTER_MEMBERS.map(
		({ memberProfileId, membershipId, displayName }) => ({
			memberProfileId,
			membershipId,
			displayName,
		})
	),
	...overrides,
});

/** Run run-1 of schedule s-1, succeeded with a feasible roster. */
export const generationFixture = (
	overrides: Partial<ScheduleGeneration> = {}
): ScheduleGeneration => ({
	runId: "run-1",
	status: "SUCCEEDED",
	engineOutcome: "FEASIBLE",
	errorCode: null,
	requestedAt: "2026-10-09T10:00:00Z",
	finishedAt: "2026-10-09T10:02:00Z",
	findings: generationFindingsFixture(),
	...overrides,
});

/** The run a schedule past DRAFT carries: still open, succeeded, or failed with a code and no findings. */
const RUN_FOR_STATUS: Record<
	Exclude<ScheduleStatus, "DRAFT">,
	() => ScheduleGeneration
> = {
	GENERATION_REQUESTED: () =>
		generationFixture({
			status: "SUBMITTED",
			engineOutcome: null,
			finishedAt: null,
			findings: null,
		}),
	GENERATED: () => generationFixture(),
	GENERATION_FAILED: () =>
		generationFixture({
			status: "FAILED",
			engineOutcome: null,
			errorCode: "snapshot_invalid",
			findings: null,
		}),
};

/**
 * Schedule s-1 once generation was requested: frozen, naming every frozen copy
 * by its own id, with who asked and when, and the run its status implies
 * unless `overrides` names one.
 */
export const generatedScheduleFixture = (
	overrides: Partial<Schedule> = {}
): Schedule => {
	const status = overrides.status ?? "GENERATION_REQUESTED";
	return scheduleFixture({
		status,
		includedShiftIds: INCLUDED_SHIFT_IDS.map(shiftCopyId),
		includedConstraintIds: INCLUDED_CONSTRAINT_IDS.map(constraintCopyId),
		generationRequestedAt: "2026-10-09T10:00:00Z",
		generationRequestedBy: { membershipId: "m-c-1", displayName: "José" },
		generation: status === "DRAFT" ? null : RUN_FOR_STATUS[status](),
		...overrides,
	});
};

/** Schedule s-1's week, Monday first. */
const ROSTER_WEEK = [
	"2026-10-12",
	"2026-10-13",
	"2026-10-14",
	"2026-10-15",
	"2026-10-16",
	"2026-10-17",
	"2026-10-18",
] as const;

/** A worked day: the live shift whose frozen copy is worked, and the job title it is worked as. */
type WorkedDay = { shift: string; jobTitleId: string; jobTitle: string };

const frontDeskLead: WorkedDay = {
	shift: "front-desk-am",
	jobTitleId: "front-desk-lead",
	jobTitle: "Front Desk Lead",
};
const frontDeskStaff: WorkedDay = {
	shift: "front-desk-am",
	jobTitleId: "front-desk-staff",
	jobTitle: "Front Desk Staff",
};
const cashier: WorkedDay = {
	shift: "lunch-rush",
	jobTitleId: "cashier",
	jobTitle: "Cashier",
};
const dutyManager: WorkedDay = {
	shift: "swing-shift",
	jobTitleId: "duty-manager",
	jobTitle: "Duty Manager",
};

/** Each member's week, Monday first, in the order of `ROSTER_MEMBERS`. */
const ROSTER_WEEKS: Array<Array<WorkedDay | AssignmentOffReason>> = [
	[
		frontDeskLead,
		frontDeskLead,
		frontDeskLead,
		frontDeskLead,
		frontDeskLead,
		"OFF",
		"OFF",
	],
	[frontDeskStaff, frontDeskStaff, "LEAVE", "LEAVE", cashier, cashier, "OFF"],
	[
		dutyManager,
		dutyManager,
		dutyManager,
		dutyManager,
		"OFF",
		dutyManager,
		dutyManager,
	],
];

/**
 * Schedule s-1's roster as `GET …/assignments` answers it: 21 rows, one per
 * member per day, by name then day. Aisha works Front Desk AM on weekdays,
 * Ben is on leave Wednesday and Thursday, Chen works the swing shift.
 */
export const scheduleAssignmentsFixture = (): Array<ScheduleAssignment> => {
	const copies = frozenShiftsFixture();
	return ROSTER_MEMBERS.flatMap((member, index) =>
		ROSTER_WEEK.map((day, dayIndex): ScheduleAssignment => {
			const plan = ROSTER_WEEKS[index]![dayIndex]!;
			const row = {
				assignmentId: `a-${member.memberProfileId}-${day}`,
				member: { ...member },
				day,
			};
			if (typeof plan === "string")
				return {
					...row,
					off: true,
					offReason: plan,
					shift: null,
					jobTitle: null,
				};
			const copy = copies.find(
				(shift) => shift.shiftId === shiftCopyId(plan.shift)
			)!;
			return {
				...row,
				off: false,
				offReason: null,
				shift: {
					shiftId: copy.shiftId,
					name: copy.name,
					group: copy.group,
					colour: copy.colour,
					startTime: copy.startTime,
					endTime: copy.endTime,
				},
				jobTitle: { jobTitleId: plan.jobTitleId, name: plan.jobTitle },
			};
		})
	);
};

type Branches = Workspace["companies"][number]["branches"];

/** "Main branch" (b-1): Front Office (d-1) and Kitchen (d-2) active, Archive (d-3) inactive. */
export const SCHEDULING_BRANCHES: Branches = [
	{
		uuid: "b-1",
		name: "Main branch",
		status: "ACTIVE",
		country: "SG",
		permissions: [],
		departments: [
			{ uuid: "d-1", name: "Front Office", status: "ACTIVE", permissions: [] },
			{ uuid: "d-2", name: "Kitchen", status: "ACTIVE", permissions: [] },
			{ uuid: "d-3", name: "Archive", status: "INACTIVE", permissions: [] },
		],
	},
];

/** Company c-1's workspace with `permissions` held company-wide, as the API sends it. */
export const schedulingWorkspace = (
	permissions: ReadonlyArray<string>
): Workspace => companyWideWorkspace(permissions, SCHEDULING_BRANCHES);
