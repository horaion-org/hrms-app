import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { DepartmentPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import { schedulePath } from "@/features/scheduling/paths";
import {
	rosterCellSchema,
	scheduleAssignmentSchema,
	scheduleKey,
	scheduleShiftsSchema,
	type ScheduleShift,
} from "@/features/scheduling/schedules/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";

/*
 * Hand changes to a generated roster (hrms-backend-v2 docs/adr/0062): preview a
 * change, apply it, undo the latest one, read the latest one and the frozen
 * shifts a change may name, all under `schedule:edit_shift`. The API checks
 * plain facts about the data (leave, roles, availability, coverage) and
 * never re-checks the scheduling rules; that is the engine's job, so every
 * preview says the rules weren't checked again.
 */

/**
 * One day to change: work a frozen shift, or not work it. A day not worked
 * names its type from the schedule's `nonWorkingDayTypes`; without one (a
 * part-timer's day, or an older API) the API decides what the day becomes.
 */
export type RosterChangeCell =
	| { membershipId: string; day: string; kind: "WORK"; shiftId: string }
	| { membershipId: string; day: string; kind: "OFF"; dayType?: string };

/** What a preview and an apply send. */
export type RosterChangeBody = {
	/** The roster revision the change was chosen at. */
	expectedRevision: number;
	cells: Array<RosterChangeCell>;
	/** Why; required when a check asks for one. */
	remark?: string;
	/** The preview's `checksFingerprint`, once the person ticked the checks. */
	checksFingerprint?: string;
	/** Preview only: days read as if their leave were already cancelled, for a shift given back right after. */
	assumeLeaveCancelledOn?: Array<string>;
	/** Apply only: this edit is the roster half of a leave move, so the API never undoes it alone. */
	leaveMove?: boolean;
};

// A code or severity a newer API adds still shows, as a plain note.
const checkCodeSchema = z
	.enum([
		"CELL_ON_LEAVE",
		"SHIFT_NOT_ON_DAY",
		"ROLE_NOT_HELD",
		"MEMBER_GONE",
		"LEAVE_APPROVED",
		"NOT_AVAILABLE",
		"OUTSIDE_AVAILABILITY",
		"ROSTERED_ELSEWHERE",
		"NOT_SCHEDULABLE_NOW",
		"WORKS_ON_DAY_OFF",
		"COVERAGE_CHANGED",
		"UNKNOWN",
	])
	.catch("UNKNOWN");

export type RosterCheckCode = z.infer<typeof checkCodeSchema>;

const checkSeveritySchema = z
	.enum(["REFUSED", "NEEDS_REMARK", "NEEDS_ACKNOWLEDGEMENT", "INFO"])
	.catch("INFO");

/**
 * What a check asks before the change may be applied: nothing (INFO), a tick
 * (NEEDS_ACKNOWLEDGEMENT), a tick and a remark (NEEDS_REMARK), or it can't
 * be applied at all (REFUSED).
 */
export type RosterCheckSeverity = z.infer<typeof checkSeveritySchema>;

const checkSchema = z.object({
	code: checkCodeSchema,
	severity: checkSeveritySchema,
	membershipId: z.string().nullable(),
	day: z.string(),
	shiftId: z.string().nullable(),
	countBefore: z.number().nullable(),
	countAfter: z.number().nullable(),
	/** On WORKS_ON_DAY_OFF, the type of the day worked; null otherwise, and from an older API. */
	dayType: z.string().nullable().catch(null),
});

export type RosterCheck = z.infer<typeof checkSchema>;

const changeCellSchema = z.object({
	membershipId: z.string().nullable(),
	displayName: z.string().nullable(),
	day: z.string(),
	before: rosterCellSchema,
	after: rosterCellSchema,
});

export type RosterChangeCellValue = z.infer<typeof changeCellSchema>;

const previewSchema = z.object({
	expectedRevision: z.number(),
	cells: z.array(changeCellSchema),
	checks: z.array(checkSchema),
	refused: z.boolean(),
	needsAcknowledgement: z.boolean(),
	needsRemark: z.boolean(),
	checksFingerprint: z.string().nullable(),
	/** NOT_CHECKED until the engine can check a hand-edited roster. */
	ruleCheck: z.string(),
});

export type RosterChangePreview = z.infer<typeof previewSchema>;

const changeSchema = z.object({
	changeId: z.string(),
	kind: z.enum(["EDIT", "UNDO"]).catch("EDIT"),
	fromRevision: z.number(),
	toRevision: z.number(),
	appliedAt: z.string(),
	appliedBy: z.object({
		membershipId: z.string(),
		displayName: z.string().nullable(),
	}),
	remark: z.string().nullable(),
	undoable: z.boolean(),
	/** Made on the published roster, so the people whose days it changed were told; absent from an older API. */
	onPublishedRoster: z
		.boolean()
		.nullish()
		.transform((value) => value ?? false),
	cells: z.array(changeCellSchema),
	/** The changed roster rows as the roster now reads them; empty on the latest-change read. */
	assignments: z.array(scheduleAssignmentSchema),
});

export type RosterChange = z.infer<typeof changeSchema>;

/** The latest change, or a null `change` for a roster as generated. */
const latestSchema = z
	.object({ change: changeSchema.nullable() })
	.transform(({ change }) => change);

/** The longest remark the API keeps, in characters. */
export const ROSTER_CHANGE_REMARK_MAX_LENGTH = 500;

const rosterChangesPath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string => `${schedulePath(companyId, unit, scheduleId)}/roster-changes`;

/** What a change would do; nothing is written. */
export const previewRosterChange = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: RosterChangeBody,
	signal?: AbortSignal
): Promise<RosterChangePreview> =>
	apiRequest(
		`${rosterChangesPath(companyId, unit, scheduleId)}/preview`,
		previewSchema,
		{ method: "POST", body, signal }
	);

/** Applies a change as one change set. */
export const applyRosterChange = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: RosterChangeBody
): Promise<RosterChange> =>
	apiRequest(rosterChangesPath(companyId, unit, scheduleId), changeSchema, {
		method: "POST",
		body,
	});

/** What undoing the roster's latest edit sends: the revision the edit produced, and what its checks ask for. */
export type RosterUndoBody = {
	expectedRevision: number;
	remark?: string;
	checksFingerprint?: string;
};

/**
 * What undoing the latest edit would write back, with the checks a fresh
 * edit would get; nothing is written. An undo is an edit back.
 */
export const previewRosterUndo = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	changeId: string,
	expectedRevision: number
): Promise<RosterChangePreview> =>
	apiRequest(
		`${rosterChangesPath(companyId, unit, scheduleId)}/${encodeURIComponent(changeId)}/undo/preview`,
		previewSchema,
		{ method: "POST", body: { expectedRevision } }
	);

/** Undoes the roster's latest edit, made at `body.expectedRevision`'s change. */
export const undoRosterChange = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	changeId: string,
	body: RosterUndoBody
): Promise<RosterChange> =>
	apiRequest(
		`${rosterChangesPath(companyId, unit, scheduleId)}/${encodeURIComponent(changeId)}/undo`,
		changeSchema,
		{ method: "POST", body }
	);

/** The roster's latest change set, or null for a roster as generated. */
export const fetchLatestRosterChange = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<RosterChange | null> =>
	apiRequest(
		`${rosterChangesPath(companyId, unit, scheduleId)}/latest`,
		latestSchema,
		{
			signal,
		}
	);

/**
 * The schedule's frozen shifts a change may name, read under
 * `schedule:edit_shift` so an editor needs no `shift:read`. Frozen copies
 * only: a draft answers none.
 */
export const fetchRosterChangeShifts = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Array<ScheduleShift>> =>
	apiRequest(
		`${rosterChangesPath(companyId, unit, scheduleId)}/shifts`,
		scheduleShiftsSchema,
		{ signal }
	);

/** The key a roster's change reads are cached under, below the schedule's own. */
export const rosterChangesKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "rosterChanges"] =>
	[...scheduleKey(companyId, scheduleId), "rosterChanges"] as const;

/** The key the latest change at `revision` is cached under. */
export const latestRosterChangeKey = (
	companyId: string,
	scheduleId: string,
	revision: number
): readonly [
	"scheduling",
	string,
	"schedules",
	string,
	"rosterChanges",
	"latest",
	number,
] => [...rosterChangesKey(companyId, scheduleId), "latest", revision] as const;

/** The key the editor's frozen shifts are cached under. */
export const rosterChangeShiftsKey = (
	companyId: string,
	scheduleId: string
): readonly [
	"scheduling",
	string,
	"schedules",
	string,
	"rosterChanges",
	"shifts",
] => [...rosterChangesKey(companyId, scheduleId), "shifts"] as const;

/** The key a preview of `body` is cached under. */
const rosterChangePreviewKey = (
	companyId: string,
	scheduleId: string,
	body: RosterChangeBody | undefined
): readonly [
	"scheduling",
	string,
	"schedules",
	string,
	"rosterChanges",
	"preview",
	number | null,
	Array<RosterChangeCell> | null,
	Array<string> | null,
] =>
	[
		...rosterChangesKey(companyId, scheduleId),
		"preview",
		body?.expectedRevision ?? null,
		body?.cells ?? null,
		body?.assumeLeaveCancelledOn ?? null,
	] as const;

/** The latest change at `revision`; `unit` undefined, or `allowed` false, asks for nothing. */
export const latestRosterChangeQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	revision: number,
	allowed: boolean
): QueryOptionsFor<
	RosterChange | null,
	ReturnType<typeof latestRosterChangeKey>
> =>
	queryOptions({
		queryKey: latestRosterChangeKey(companyId, scheduleId, revision),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<RosterChange | null> =>
						fetchLatestRosterChange(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry: false,
	});

/** The editor's frozen shifts; `unit` undefined, or `allowed` false, asks for nothing. */
export const rosterChangeShiftsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed: boolean
): QueryOptionsFor<
	Array<ScheduleShift>,
	ReturnType<typeof rosterChangeShiftsKey>
> =>
	queryOptions({
		queryKey: rosterChangeShiftsKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<ScheduleShift>> =>
						fetchRosterChangeShifts(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry: false,
	});

/**
 * A preview of `body`; `body` undefined asks for nothing. Keyed by the
 * revision and cells, so a new choice or a moved roster previews again.
 */
export const rosterChangePreviewQuery = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: RosterChangeBody | undefined
): QueryOptionsFor<
	RosterChangePreview,
	ReturnType<typeof rosterChangePreviewKey>
> =>
	queryOptions({
		queryKey: rosterChangePreviewKey(companyId, scheduleId, body),
		queryFn: body
			? ({ signal }): Promise<RosterChangePreview> =>
					previewRosterChange(companyId, unit, scheduleId, body, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 0,
		gcTime: 0,
		retry: false,
	});
