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
	decidedAt: null,
	decidedBy: null,
	rejectionReason: null,
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

/**
 * What the engine found for schedule s-1's roster, shaped as the API serves
 * it (the engine's camelCase keys, entities included): an error about Ben, a
 * shift nobody can take, Saturday morning one short, and a message on
 * Chen's Sunday.
 */
export const generationFindingsFixture = (
	overrides: Partial<GenerationFindings> = {}
): GenerationFindings => ({
	scheduleStatus: "FEASIBLE",
	failureReason: null,
	generatedAt: "2026-10-09T10:01:30Z",
	errors: [
		{
			employeeId: "mp-2",
			date: null,
			messages: ["Ben Ong works more than five days in a row."],
		},
	],
	diagnostics: [
		{
			code: "DEAD_SHIFT",
			severity: "warning",
			audience: "configuration",
			message: "Shift Breakfast Prep: no employee holds an eligible role.",
			entities: { shiftId: shiftCopyId("breakfast-prep") },
		},
	],
	conflicts: [
		{
			kind: "conflict",
			conflictId: "cf-1",
			date: "2026-10-17",
			roleUuid: "front-desk-staff",
			startBlock: 258,
			endBlock: 270,
			start: "2026-10-17T09:00:00",
			end: "2026-10-17T15:00:00",
			missing: 1,
			message: "Front Desk AM is one Front Desk Staff short.",
			sourceRule: "shift_demand_requirement",
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

/** A setup diagnostic of schedule s-1, as the engine words and keys it. */
const diagnosticFixture = (
	code: string,
	message: string,
	entities: Record<string, unknown>,
	severity = "warning"
): GenerationFindings["diagnostics"][number] => ({
	code,
	severity,
	audience: "configuration",
	message,
	entities,
});

/**
 * Every kind of finding the roster page places: the four known diagnostic
 * codes and one it doesn't know, a day's error, a conflict about one member,
 * a conflict from the demand forecast, one whose constraint isn't listed, and
 * an error about a member who no longer resolves (mp-9).
 */
export const findingsOfEveryKindFixture = (): GenerationFindings => {
	const findings = generationFindingsFixture();
	const [morningCover] = findings.conflicts;
	return generationFindingsFixture({
		errors: [
			...findings.errors,
			{
				employeeId: null,
				date: "2026-10-16",
				messages: ["Friday is short of one Cashier."],
			},
			{
				employeeId: "mp-9",
				date: null,
				messages: ["An unknown member is short of rest."],
			},
		],
		diagnostics: [
			diagnosticFixture(
				"UNCOVERABLE_DEMAND",
				"Role Front Desk Staff: no shift can cover 2026-10-17 06:00-08:00 - add a covering shift or adjust the demand forecast.",
				{ roleId: "front-desk-staff", firstBlock: 252, lastBlock: 255 }
			),
			diagnosticFixture(
				"RULE_REFERENCES_MISSING_ENTITY",
				'Rule "Lunch cover with stand-ins": references 2 entities not present in this schedule\'s input.',
				{
					rule: "shift_demand_with_substitutes",
					missing: ["service-staff", "supervisor"],
				}
			),
			diagnosticFixture(
				"UNASSIGNABLE_EMPLOYEE",
				"Ben Ong (Front Desk Staff): no shift fits their role and availability this horizon - they can only be scheduled off.",
				{ employeeId: "mp-2", roleId: "front-desk-staff" }
			),
			...findings.diagnostics,
			diagnosticFixture(
				"SHIFT_TOO_SHORT",
				"Shift Lunch Rush is shorter than one block.",
				{},
				"info"
			),
		],
		conflicts: [
			...findings.conflicts,
			{
				...morningCover!,
				conflictId: "cf-2",
				date: "2026-10-16",
				start: "2026-10-16T11:00:00",
				end: "2026-10-16T13:00:00",
				message: "Lunch is one Cashier short.",
				sourceRule: "timeblock_demand_coverage",
				sourceRuleId: null,
			},
			{
				...morningCover!,
				conflictId: "cf-3",
				date: "2026-10-16",
				start: "2026-10-16T07:00:00",
				end: "2026-10-16T09:00:00",
				missing: 2,
				message: "Early desk is two short.",
				sourceRule: "shift_presence_requirement",
				sourceRuleId: "a-constraint-not-listed",
			},
			{
				...morningCover!,
				conflictId: "cf-4",
				message: "Ben Ong is short of rest before Saturday.",
				employeeUuid: "mp-2",
			},
		],
		members: [
			...findings.members,
			{ memberProfileId: "mp-9", membershipId: null, displayName: null },
		],
	});
};

/** A generated roster the engine found nothing to say about. */
export const emptyFindingsFixture = (): GenerationFindings =>
	generationFindingsFixture({
		errors: [],
		diagnostics: [],
		conflicts: [],
		assignmentMessages: [],
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
	PUBLISHED: () => generationFixture(),
	REJECTED: () => generationFixture(),
	// A status this build does not know yet: its run is as unknown to it.
	UNKNOWN: () => generationFixture({ status: "UNKNOWN" }),
};

/** The decision a PUBLISHED or REJECTED schedule carries: José decided the roster he asked for. */
const decisionFor = (status: ScheduleStatus): Partial<Schedule> =>
	status === "PUBLISHED" || status === "REJECTED"
		? {
				decidedAt: "2026-10-09T11:00:00Z",
				decidedBy: { membershipId: "m-c-1", displayName: "José" },
				rejectionReason:
					status === "REJECTED"
						? "Two nights have no supervisor. Regenerate once Siti is back."
						: null,
			}
		: {};

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
		...decisionFor(status),
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
