import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import {
	constraintCategorySchema,
	constraintRequirementSchema,
	constraintTypeSchema,
	constraintValueSchema,
} from "@/features/scheduling/constraints/api";
import {
	SCHEDULING_QUERY_ROOT,
	schedulePath,
	schedulesPath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import {
	SHIFT_COLOUR_PATTERN,
	shiftRoleSchema,
	weekdaySchema,
} from "@/features/scheduling/shifts/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The schedules API: a Department's schedules. A schedule exists as a DRAFT
 * from the moment Setup is completed and remembers which of the Department's
 * live shifts and constraints are ticked; generating it freezes those shifts
 * and constraints into the schedule, and once generated it has a roster.
 * Paths, fields and codes follow §2.4 of the API's
 * `docs/implementation/2026-10-11-shifts-module.md`, §4.5 of its
 * `docs/implementation/2026-10-12-scheduling-constraints.md` and its
 * `docs/implementation/2026-10-27-roster-read-model.md`.
 */

const scheduleStatusSchema = z.enum([
	"DRAFT",
	"GENERATION_REQUESTED",
	"GENERATED",
	"GENERATION_FAILED",
]);

/**
 * A DRAFT can be changed; once generation is requested it is frozen, and its
 * generation run ends as GENERATED or GENERATION_FAILED.
 */
export type ScheduleStatus = z.infer<typeof scheduleStatusSchema>;

const generationRunStatusSchema = z.enum([
	"PENDING_SUBMIT",
	"SUBMITTED",
	"SUCCEEDED",
	"FAILED",
]);

/** A generation run is open while PENDING_SUBMIT or SUBMITTED, then ends as SUCCEEDED or FAILED. */
export type GenerationRunStatus = z.infer<typeof generationRunStatusSchema>;

const OPEN_RUN_STATUSES: ReadonlyArray<GenerationRunStatus> = [
	"PENDING_SUBMIT",
	"SUBMITTED",
];

/*
 * What the engine reported besides the roster (§1.2 of the API's
 * `docs/implementation/2026-10-27-roster-read-model.md`). Every message is the
 * engine's prose and may name members: shown quoted, never as the app's own
 * copy (ADR-0003). Keys the app doesn't know are dropped.
 */

const findingsViolationSchema = z.object({
	/** The member profile it is about, or null for a day's entry. */
	employeeId: z.string().nullable(),
	/** The day it is about, or null for a member's entry. */
	date: z.string().nullable(),
	messages: z.array(z.string()),
});

const findingsDiagnosticSchema = z.object({
	code: z.string(),
	severity: z.string(),
	audience: z.string(),
	message: z.string(),
	/** The ids and values it is about, as the engine keyed them. */
	entities: z.record(z.string(), z.unknown()),
});

/** A finding about the schedule's input, made before the solve. */
export type FindingsDiagnostic = z.infer<typeof findingsDiagnosticSchema>;

const findingsConflictSchema = z.object({
	kind: z.string(),
	conflictId: z.string(),
	date: z.string(),
	/** The job title that is short. */
	roleUuid: z.string(),
	startBlock: z.number(),
	endBlock: z.number(),
	start: z.string(),
	end: z.string(),
	/** The largest shortfall over the span. */
	missing: z.number(),
	message: z.string().nullable(),
	sourceRule: z.string(),
	sourceRuleId: z.string().nullable(),
	shiftUuids: z.array(z.string()),
	repairRungs: z.array(z.string()),
	/** The member an employee-scoped hole is about, otherwise null. */
	employeeUuid: z.string().nullable(),
});

/** A staffing hole the solve left. */
export type FindingsConflict = z.infer<typeof findingsConflictSchema>;

const findingsAssignmentMessagesSchema = z.object({
	employeeId: z.string(),
	day: z.string(),
	messages: z.array(z.string()),
});

const findingsMemberSchema = z.object({
	/** The engine's employee id, which the other findings refer to. */
	memberProfileId: z.string(),
	/** Null when the id did not resolve to a member of the company. */
	membershipId: z.string().nullable(),
	/** Null when the id did not resolve or the member has since been removed. */
	displayName: z.string().nullable(),
});

const generationFindingsSchema = z.object({
	/** The solver's own status, e.g. OPTIMAL or INFEASIBLE. */
	scheduleStatus: z.string(),
	/** The engine's explanation of a failed solve. */
	failureReason: z.string().nullable(),
	generatedAt: z.string(),
	errors: z.array(findingsViolationSchema),
	diagnostics: z.array(findingsDiagnosticSchema),
	conflicts: z.array(findingsConflictSchema),
	assignmentMessages: z.array(findingsAssignmentMessagesSchema),
	/** Every member the findings refer to, so an id can be shown as a name. */
	members: z.array(findingsMemberSchema).default([]),
});

export type GenerationFindings = z.infer<typeof generationFindingsSchema>;

const generationSchema = z.object({
	runId: z.string(),
	status: generationRunStatusSchema,
	/** The engine's outcome once the job succeeded (OPTIMAL, FEASIBLE, INFEASIBLE), otherwise null. */
	engineOutcome: z.string().nullable(),
	/**
	 * The run's last error code. Why the run ended only when FAILED: an open
	 * run carries the failure being retried, and a SUCCEEDED one may keep the
	 * code of a retry before it succeeded. The engine may add codes.
	 */
	errorCode: z.string().nullable(),
	requestedAt: z.string(),
	finishedAt: z.string().nullable(),
	/** Null until a result is applied. */
	findings: generationFindingsSchema.nullable(),
});

/** A schedule's newest generation run and what it found. */
export type ScheduleGeneration = z.infer<typeof generationSchema>;

const scheduleSchema = z.object({
	scheduleId: z.string(),
	companyId: z.string(),
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	/** The IANA name of the branch's time zone, which the schedule's days are in. */
	timeZone: z.string(),
	name: z.string(),
	/** The Monday the week-long period starts, as an ISO date. */
	periodStart: z.string(),
	/** The Sunday it ends, six days on. */
	periodEnd: z.string(),
	includeLeave: z.boolean(),
	allowOpenShifts: z.boolean(),
	status: scheduleStatusSchema,
	/** A draft's ticked live shifts; once generated, every frozen copy's own id. */
	includedShiftIds: z.array(z.string()),
	/** A draft's ticked live ACTIVE constraints; once generated, every frozen copy's own id. */
	includedConstraintIds: z.array(z.string()),
	/** Set exactly when the status is not DRAFT. */
	generationRequestedAt: z.string().nullable(),
	/** `displayName` is null once the requester has left the company. */
	generationRequestedBy: z
		.object({ membershipId: z.string(), displayName: z.string().nullable() })
		.nullable(),
	/** The newest generation run, or null for a schedule that has none. */
	generation: generationSchema.nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** A schedule as the API answers it; its shifts, constraints and roster are read on their own. */
export type Schedule = z.infer<typeof scheduleSchema>;

/** How often a schedule whose generation is in progress is read again. */
const GENERATION_POLL_INTERVAL_MS = 15_000;

/**
 * Whether a schedule is still being generated: requested, or GENERATED while
 * a newer run is still open. Its roster page shows that and polls meanwhile.
 */
export const generationInProgress = ({
	status,
	generation,
}: Schedule): boolean =>
	status === "GENERATION_REQUESTED" ||
	(status === "GENERATED" &&
		generation !== null &&
		OPEN_RUN_STATUSES.includes(generation.status));

/**
 * Whether a schedule can be generated again: its last generation ended,
 * GENERATED or GENERATION_FAILED, and no newer run is open.
 */
export const regenerable = (schedule: Schedule): boolean =>
	(schedule.status === "GENERATED" ||
		schedule.status === "GENERATION_FAILED") &&
	!generationInProgress(schedule);

const schedulePageSchema = z.object({
	content: z.array(scheduleSchema),
	page: z.object({ hasNext: z.boolean() }),
});

/** Read every page so history and its search include all accessible schedules. */
export const fetchSchedules = async (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<Schedule>> => {
	const schedules: Array<Schedule> = [];
	for (let page = 0; ; page += 1) {
		const search = new URLSearchParams({
			page: String(page),
			size: "100",
			sort: "updatedAt,desc",
		});
		// The next page is requested only when this page reports one exists.
		// eslint-disable-next-line no-await-in-loop
		const result = await apiRequest(
			`/api/v1/companies/${encodeURIComponent(companyId)}/schedules?${search.toString()}`,
			schedulePageSchema,
			{ signal }
		);
		schedules.push(...result.content);
		if (!result.page.hasNext) return schedules;
	}
};

/** What creating or replacing a schedule sends: its setup and the ticked live shifts and constraints. */
export type ScheduleBody = {
	name: string;
	periodStart: string;
	includeLeave: boolean;
	allowOpenShifts: boolean;
	includedShiftIds: Array<string>;
	includedConstraintIds: Array<string>;
};

/** Creates a DRAFT schedule for a Department. */
export const createSchedule = (
	companyId: string,
	unit: DepartmentPath,
	body: ScheduleBody
): Promise<Schedule> =>
	apiRequest(schedulesPath(companyId, unit), scheduleSchema, {
		method: "POST",
		body,
	});

export const fetchSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Schedule> =>
	apiRequest(schedulePath(companyId, unit, scheduleId), scheduleSchema, {
		signal,
	});

/** Replaces a DRAFT schedule's setup and ticks; the ticks sent are the whole set. */
export const updateSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: ScheduleBody
): Promise<Schedule> =>
	apiRequest(schedulePath(companyId, unit, scheduleId), scheduleSchema, {
		method: "PUT",
		body,
	});

/**
 * Freezes a DRAFT's ticked live shifts and constraints into it and marks it
 * GENERATION_REQUESTED. Whatever it answers is not read: the page leaves
 * the schedule and every scheduling query reloads.
 */
export const requestGeneration = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<void> =>
	apiRequestVoid(`${schedulePath(companyId, unit, scheduleId)}/generation`, {
		method: "POST",
	});

/**
 * Generates a GENERATED or GENERATION_FAILED schedule again from its frozen
 * shifts and constraints: its roster is removed and it is
 * GENERATION_REQUESTED until the new run ends. Whatever it answers is not
 * read: every scheduling query reloads.
 */
export const requestRegeneration = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<void> =>
	apiRequestVoid(`${schedulePath(companyId, unit, scheduleId)}/regeneration`, {
		method: "POST",
	});

/**
 * Soft-deletes a schedule in any status but GENERATION_REQUESTED, which the
 * API refuses with 409 SCHEDULE_GENERATION_IN_PROGRESS.
 */
export const deleteSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<void> =>
	apiRequestVoid(schedulePath(companyId, unit, scheduleId), {
		method: "DELETE",
	});

const scheduleShiftSchema = z.object({
	/** The live shift while DRAFT; once frozen, the copy's own id, which no shift route knows. */
	shiftId: z.string(),
	name: z.string(),
	group: z.string(),
	colour: z.string().regex(SHIFT_COLOUR_PATTERN),
	startTime: z.string(),
	endTime: z.string(),
	days: z.array(weekdaySchema),
	roles: z.array(shiftRoleSchema),
	/** Whether the schedule ticks it. */
	included: z.boolean(),
	/** A copy made at generation, never changed again. */
	frozen: z.boolean(),
});

/**
 * One row of a schedule's shifts: for a DRAFT, one of the Department's live
 * shifts with whether it is ticked; once generated, one frozen copy.
 */
export type ScheduleShift = z.infer<typeof scheduleShiftSchema>;

const scheduleShiftsSchema = z.array(scheduleShiftSchema);

/** A schedule's shifts, ordered by group then name. */
export const fetchScheduleShifts = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Array<ScheduleShift>> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/shifts`,
		scheduleShiftsSchema,
		{ signal }
	);

const scheduleConstraintSchema = z.object({
	/** The live constraint while DRAFT; once frozen, the copy's own id, which no constraint route knows. */
	constraintId: z.string(),
	name: z.string(),
	type: constraintTypeSchema,
	category: constraintCategorySchema,
	requirement: constraintRequirementSchema.nullable(),
	/** As on a live constraint; once frozen, a shift is the schedule's frozen copy and each name is as it was at generation. */
	values: z.array(constraintValueSchema),
	/** Whether the schedule ticks it. */
	included: z.boolean(),
	/** A copy made at generation, never changed again. */
	frozen: z.boolean(),
});

/**
 * One row of a schedule's constraints: for a DRAFT, one of the Department's
 * live ACTIVE constraints with whether it is ticked; once generated, one frozen
 * copy.
 */
export type ScheduleConstraint = z.infer<typeof scheduleConstraintSchema>;

const scheduleConstraintsSchema = z.array(scheduleConstraintSchema);

/** A schedule's constraints, by name. */
export const fetchScheduleConstraints = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Array<ScheduleConstraint>> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/constraints`,
		scheduleConstraintsSchema,
		{ signal }
	);

const assignmentOffReasonSchema = z.enum(["OFF", "LEAVE"]);

/** Why a member is off on a day: a plain day off, or approved leave. */
export type AssignmentOffReason = z.infer<typeof assignmentOffReasonSchema>;

const scheduleAssignmentSchema = z.object({
	/** The row's own id: a stable key even when its member no longer resolves. */
	assignmentId: z.string(),
	/** Null once the member's profile is no longer live in the company. */
	member: z
		.object({
			membershipId: z.string(),
			/** The engine's employee id, as the findings name members. */
			memberProfileId: z.string(),
			/** Null once their membership or user is removed. */
			displayName: z.string().nullable(),
			employeeCode: z.string(),
			/** Their current home job title, or null when they hold none. */
			jobTitleName: z.string().nullable(),
		})
		.nullable(),
	/** A day of the schedule's week, as an ISO date. */
	day: z.string(),
	off: z.boolean(),
	/** Why they are off, or null on a working day. */
	offReason: assignmentOffReasonSchema.nullable(),
	/** The frozen shift worked, or null when off. */
	shift: z
		.object({
			/** The frozen copy's own id, as the schedule's shifts list it. */
			shiftId: z.string(),
			name: z.string(),
			group: z.string(),
			colour: z.string().regex(SHIFT_COLOUR_PATTERN),
			/** "HH:mm"; an end at or before the start runs past midnight. */
			startTime: z.string(),
			endTime: z.string(),
		})
		.nullable(),
	/** The job title the shift is worked as, named as frozen with it; null when off. */
	jobTitle: z.object({ jobTitleId: z.string(), name: z.string() }).nullable(),
});

/** One member's day in a generated schedule: a frozen shift, or off with its reason. */
export type ScheduleAssignment = z.infer<typeof scheduleAssignmentSchema>;

const scheduleAssignmentsSchema = z.array(scheduleAssignmentSchema);

/**
 * A schedule's roster: one row per member per day of its week, by display
 * name, member, then day. Empty unless the schedule is GENERATED.
 */
export const fetchScheduleAssignments = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Array<ScheduleAssignment>> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/assignments`,
		scheduleAssignmentsSchema,
		{ signal }
	);

/** The key the company's whole list of schedules is cached under. */
export const schedulesKey = (
	companyId: string
): readonly ["scheduling", string, "list"] =>
	[SCHEDULING_QUERY_ROOT, companyId, "list"] as const;

/** The key one schedule is cached under, whichever department it is reached through. */
export const scheduleKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "schedules", scheduleId] as const;

/** Whether a schedule is read again every 15 seconds while it is being generated. */
export type SchedulePolling = { pollWhileGenerating?: boolean };

/**
 * One schedule; `unit` undefined, or `allowed` false, asks for nothing. With
 * `pollWhileGenerating`, it is read again every 15 seconds while its
 * generation is in progress, and no longer once it ends.
 */
export const scheduleQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true,
	{ pollWhileGenerating = false }: SchedulePolling = {}
): UndefinedInitialDataOptions<
	Schedule,
	Error,
	Schedule,
	ReturnType<typeof scheduleKey>
> =>
	queryOptions({
		queryKey: scheduleKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Schedule> =>
						fetchSchedule(companyId, unit, scheduleId, signal)
				: skipToken,
		// One record: a 404 may mean it moved out of reach.
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		refetchInterval: pollWhileGenerating
			? (query): number | false =>
					query.state.data !== undefined &&
					generationInProgress(query.state.data)
						? GENERATION_POLL_INTERVAL_MS
						: false
			: false,
		refetchIntervalInBackground: false,
		retry,
	});

/** The key a schedule's shifts are cached under, below the schedule's own. */
export const scheduleShiftsKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "shifts"] =>
	[...scheduleKey(companyId, scheduleId), "shifts"] as const;

/** A schedule's shifts; `unit` undefined, or `allowed` false, asks for nothing. */
export const scheduleShiftsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<ScheduleShift>,
	Error,
	Array<ScheduleShift>,
	ReturnType<typeof scheduleShiftsKey>
> =>
	queryOptions({
		queryKey: scheduleShiftsKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<ScheduleShift>> =>
						fetchScheduleShifts(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The key a schedule's constraints are cached under, below the schedule's own. */
export const scheduleConstraintsKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "constraints"] =>
	[...scheduleKey(companyId, scheduleId), "constraints"] as const;

/** A schedule's constraints; `unit` undefined, or `allowed` false, asks for nothing. */
export const scheduleConstraintsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<ScheduleConstraint>,
	Error,
	Array<ScheduleConstraint>,
	ReturnType<typeof scheduleConstraintsKey>
> =>
	queryOptions({
		queryKey: scheduleConstraintsKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<ScheduleConstraint>> =>
						fetchScheduleConstraints(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The key a schedule's roster is cached under, below the schedule's own. */
export const scheduleAssignmentsKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "assignments"] =>
	[...scheduleKey(companyId, scheduleId), "assignments"] as const;

/** A schedule's roster; `unit` undefined, or `allowed` false, asks for nothing. */
export const scheduleAssignmentsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<ScheduleAssignment>,
	Error,
	Array<ScheduleAssignment>,
	ReturnType<typeof scheduleAssignmentsKey>
> =>
	queryOptions({
		queryKey: scheduleAssignmentsKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<ScheduleAssignment>> =>
						fetchScheduleAssignments(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
