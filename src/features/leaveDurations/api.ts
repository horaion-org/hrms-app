import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import {
	reachedBranchSchema,
	reachedDepartmentSchema,
} from "@/features/workspace/unitReach";

/*
 * The company's leave durations as HR and department admins manage them (the
 * API's ADR-0077): the named parts of a day people can take as leave, such as
 * "Morning" 09:00–13:00, each applying to the whole company, chosen Branches
 * or chosen Departments. Read under `leave_duration:read` and changed under
 * `leave_duration:update`, both held anywhere: the API lists the whole
 * company's durations and those of the reader's units, and marks each row
 * with `canEdit` when the caller's update key covers every unit it applies
 * to. Reordering the one company list needs the key company-wide.
 */

/** The most characters a leave duration's name takes. */
export const LEAVE_DURATION_NAME_MAX_LENGTH = 100;

// A status a newer API adds reads as UNKNOWN instead of failing the whole answer.
const leaveDurationStatusSchema = z
	.enum(["ACTIVE", "INACTIVE", "UNKNOWN"])
	.catch("UNKNOWN");

/** A leave duration's status; an inactive one is not offered. */
export type LeaveDurationStatus = z.infer<typeof leaveDurationStatusSchema>;

const managedLeaveDurationSchema = z.object({
	leaveDurationId: z.string(),
	name: z.string(),
	/** "HH:mm"; an end before the start runs past midnight. */
	startTime: z.string(),
	endTime: z.string(),
	/** The length between the two times. */
	minutes: z.number().int(),
	status: leaveDurationStatusSchema,
	displayOrder: z.number().int(),
	/** Where it applies; both empty is the whole company. */
	appliesToBranches: z.array(reachedBranchSchema).catch([]),
	appliesToDepartments: z.array(reachedDepartmentSchema).catch([]),
	/** Whether the caller may change it; when in doubt, no. */
	canEdit: z.boolean().catch(false),
});

/** One leave duration as its admins see it. */
export type ManagedLeaveDuration = z.infer<typeof managedLeaveDurationSchema>;

const catalogueSchema = z.array(managedLeaveDurationSchema);

/** What adding a leave duration sends. Both unit lists empty is the whole company. */
export type LeaveDurationBody = {
	name: string;
	startTime: string;
	endTime: string;
	appliesToBranchIds: Array<string>;
	appliesToDepartmentIds: Array<string>;
};

/** What replacing a leave duration sends: its fields and status. */
export type UpdateLeaveDurationBody = LeaveDurationBody & {
	status: "ACTIVE" | "INACTIVE";
};

/** The company list's new order: every live duration, first to last. */
export type LeaveDurationOrderBody = {
	leaveDurationIds: Array<string>;
};

const leaveDurationsPath = (companyId: string): string =>
	`${companyPath(companyId)}/leave-durations`;

const leaveDurationPath = (
	companyId: string,
	leaveDurationId: string
): string =>
	`${leaveDurationsPath(companyId)}/${encodeURIComponent(leaveDurationId)}`;

/** The durations the caller sees, in the company order. */
export const fetchLeaveDurationCatalogue = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<ManagedLeaveDuration>> =>
	apiRequest(leaveDurationsPath(companyId), catalogueSchema, { signal });

/** Adds an active leave duration at the end of the list. */
export const createLeaveDuration = (
	companyId: string,
	body: LeaveDurationBody
): Promise<ManagedLeaveDuration> =>
	apiRequest(leaveDurationsPath(companyId), managedLeaveDurationSchema, {
		method: "POST",
		body,
	});

/** Replaces a leave duration's fields and status; its place stays. */
export const updateLeaveDuration = (
	companyId: string,
	leaveDurationId: string,
	body: UpdateLeaveDurationBody
): Promise<ManagedLeaveDuration> =>
	apiRequest(
		leaveDurationPath(companyId, leaveDurationId),
		managedLeaveDurationSchema,
		{ method: "PUT", body }
	);

/** Removes a leave duration; requests that used it keep their times. */
export const deleteLeaveDuration = (
	companyId: string,
	leaveDurationId: string
): Promise<void> =>
	apiRequestVoid(leaveDurationPath(companyId, leaveDurationId), {
		method: "DELETE",
	});

/** Sets the company list's order and answers the whole list. */
export const reorderLeaveDurations = (
	companyId: string,
	body: LeaveDurationOrderBody
): Promise<Array<ManagedLeaveDuration>> =>
	apiRequest(`${leaveDurationsPath(companyId)}/order`, catalogueSchema, {
		method: "PUT",
		body,
	});

/** Every leave duration query of a company starts with this. */
export const leaveDurationsKey = (
	companyId: string
): readonly [string, string] => ["leave-durations", companyId] as const;

/** The durations the caller sees; `allowed` false asks for nothing. */
export const leaveDurationCatalogueQuery = (
	companyId: string,
	allowed = true
): QueryOptionsFor<
	Array<ManagedLeaveDuration>,
	readonly [string, string, "catalogue"]
> =>
	queryOptions({
		queryKey: [...leaveDurationsKey(companyId), "catalogue"] as const,
		queryFn: allowed
			? ({ signal }): Promise<Array<ManagedLeaveDuration>> =>
					fetchLeaveDurationCatalogue(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
