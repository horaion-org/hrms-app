import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/features/organisation/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The company's leave type catalogue as its admins manage it (the API's
 * ADR-0055): every type, active and inactive, with how many leave requests
 * use it. Read under `leave_type:read` and changed under `leave_type:update`,
 * both held company-wide. The scheduler's day off (`system`) is listed and
 * never changed. Members read the active types to apply through
 * `activeLeaveTypesQuery` in `features/leave`, with no key.
 */

/** The kinds a type can be given here, in the order the catalogue groups them. */
export const LEAVE_GRANT_KINDS = [
	"ALLOWANCE",
	"PER_OCCASION",
	"UNTRACKED",
] as const;

/** How a leave type is counted. */
export type LeaveGrantKind = (typeof LEAVE_GRANT_KINDS)[number];

/** The most characters a leave type's name takes. */
export const LEAVE_TYPE_NAME_MAX_LENGTH = 100;

// A kind or status a newer API adds reads as UNKNOWN instead of failing the whole answer.
const grantKindSchema = z
	.enum([...LEAVE_GRANT_KINDS, "UNKNOWN"])
	.catch("UNKNOWN");
const leaveTypeStatusSchema = z
	.enum(["ACTIVE", "INACTIVE", "UNKNOWN"])
	.catch("UNKNOWN");

/** A leave type's status; an inactive type is not offered for new requests. */
export type LeaveTypeStatus = z.infer<typeof leaveTypeStatusSchema>;

const managedLeaveTypeSchema = z.object({
	leaveTypeId: z.string(),
	code: z.string(),
	name: z.string(),
	grantKind: grantKindSchema,
	paid: z.boolean(),
	requiresReason: z.boolean(),
	status: leaveTypeStatusSchema,
	displayOrder: z.number().int(),
	system: z.boolean(),
	/** How many leave requests use it, in any status; names nobody. */
	requestCount: z.number().int(),
});

/** One leave type as its admins see it, with how many requests use it. */
export type ManagedLeaveType = z.infer<typeof managedLeaveTypeSchema>;

const catalogueSchema = z.array(managedLeaveTypeSchema);

/** What adding a leave type sends; the API makes its code from the name. */
export type LeaveTypeBody = {
	name: string;
	grantKind: LeaveGrantKind;
	paid: boolean;
	requiresReason: boolean;
};

/** What replacing a leave type sends: its fields and status. */
export type UpdateLeaveTypeBody = LeaveTypeBody & {
	status: "ACTIVE" | "INACTIVE";
};

/** One grant kind's new order: every one of its types, first to last. */
export type LeaveTypeOrderBody = {
	grantKind: LeaveGrantKind;
	leaveTypeIds: Array<string>;
};

const leaveTypesPath = (companyId: string): string =>
	`${companyPath(companyId)}/leave-types`;

/** The whole catalogue in the API's order: kind, then the company's order, the day off last. */
export const fetchLeaveTypeCatalogue = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<ManagedLeaveType>> =>
	apiRequest(leaveTypesPath(companyId), catalogueSchema, { signal });

/** Adds an active leave type at the end of its kind. */
export const createLeaveType = (
	companyId: string,
	body: LeaveTypeBody
): Promise<ManagedLeaveType> =>
	apiRequest(leaveTypesPath(companyId), managedLeaveTypeSchema, {
		method: "POST",
		body,
	});

/** Replaces a leave type's fields and status. Its kind is fixed once a request uses it. */
export const updateLeaveType = (
	companyId: string,
	leaveTypeId: string,
	body: UpdateLeaveTypeBody
): Promise<ManagedLeaveType> =>
	apiRequest(
		`${leaveTypesPath(companyId)}/${encodeURIComponent(leaveTypeId)}`,
		managedLeaveTypeSchema,
		{ method: "PUT", body }
	);

/** Sets one kind's order and answers the whole catalogue. */
export const reorderLeaveTypes = (
	companyId: string,
	body: LeaveTypeOrderBody
): Promise<Array<ManagedLeaveType>> =>
	apiRequest(`${leaveTypesPath(companyId)}/order`, catalogueSchema, {
		method: "PUT",
		body,
	});

/** Every leave type query of a company starts with this, the apply form's catalogue included. */
export const leaveTypesKey = (companyId: string): readonly [string, string] =>
	["leave-types", companyId] as const;

/** The catalogue with request counts; `allowed` false asks for nothing. */
export const leaveTypeCatalogueQuery = (
	companyId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<ManagedLeaveType>,
	Error,
	Array<ManagedLeaveType>,
	readonly [string, string, "catalogue"]
> =>
	queryOptions({
		queryKey: [...leaveTypesKey(companyId), "catalogue"] as const,
		queryFn: allowed
			? ({ signal }): Promise<Array<ManagedLeaveType>> =>
					fetchLeaveTypeCatalogue(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
