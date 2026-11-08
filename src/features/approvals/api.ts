import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { companyPath } from "@/features/organisation/api";
import { administrativeMeta, selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The approvals API (hrms-backend-v2 ADR-0067, PR #158): approval flows per
 * department, and the submissions (instances) they open. P1 approves one
 * subject, a schedule's publication: Publish on a department with a flow
 * submits the roster instead, and the last step's approval publishes it.
 * Flows are read under `approval_flow:read` and changed under
 * `approval_flow:manage`, both company-wide; submissions are read under
 * `approval:read` and decided under `approval:decide` at the department.
 * The caller's own waiting list and their own withdrawal need no key.
 */

/** The most steps the API keeps per flow; Settings offers at most `APPROVAL_FLOW_MAX_STEPS`. */
export const APPROVAL_FLOW_MAX_STEPS = 3;
/** The most people a "only these people" step names. */
export const APPROVAL_STEP_MAX_MEMBERS = 10;
export const APPROVAL_STEP_LABEL_MAX_LENGTH = 80;
/**
 * The app keeps step names to 1–2 words (24 characters): they show in the
 * header's meta line, the inbox row and the trail. Approval flow UI
 * research addendum C7.
 */
export const APPROVAL_STEP_LABEL_INPUT_MAX_LENGTH = 24;
export const APPROVAL_FLOW_NAME_MAX_LENGTH = 100;
/** The longest comment or reason a decision keeps, in characters. */
export const APPROVAL_COMMENT_MAX_LENGTH = 500;

export const APPROVAL_STEP_RULES = ["KEY_HOLDERS", "MEMBERS"] as const;
/** Who decides a step: anyone holding the subject's key at the department, or only named people among them. */
export type ApprovalStepRule = (typeof APPROVAL_STEP_RULES)[number];

export const APPROVAL_QUORUMS = ["ANY", "ALL"] as const;
/** Whether one approval closes a step, or every eligible person's. */
export type ApprovalQuorum = (typeof APPROVAL_QUORUMS)[number];

// A value a newer API adds reads as UNKNOWN instead of failing the whole answer.
const ruleSchema = z.enum([...APPROVAL_STEP_RULES, "UNKNOWN"]).catch("UNKNOWN");
const quorumSchema = z.enum([...APPROVAL_QUORUMS, "UNKNOWN"]).catch("UNKNOWN");
const stepStatusSchema = z
	.enum(["WAITING", "OPEN", "APPROVED", "REJECTED", "SKIPPED", "UNKNOWN"])
	.catch("UNKNOWN");
const instanceStatusSchema = z
	.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED", "UNKNOWN"])
	.catch("UNKNOWN");
const decisionTypeSchema = z
	.enum(["APPROVE", "REJECT", "UNKNOWN"])
	.catch("UNKNOWN");

/** What an approval decides; P1 knows schedule publication only. */
export const SCHEDULE_PUBLICATION = "SCHEDULE_PUBLICATION";

/** A company member named on an approval; `displayName` is null once they have left the company. */
const participantSchema = z.object({
	membershipId: z.string(),
	displayName: z.string().nullable(),
});

export type ApprovalParticipant = z.infer<typeof participantSchema>;

const decisionSchema = z.object({
	decidedBy: participantSchema.nullable(),
	decision: decisionTypeSchema,
	comment: z
		.string()
		.nullish()
		.transform((value) => value ?? null),
	decidedAt: z.string(),
});

export type ApprovalDecision = z.infer<typeof decisionSchema>;

const instanceStepSchema = z.object({
	stepOrder: z.number().int(),
	label: z.string(),
	rule: ruleSchema,
	quorum: quorumSchema,
	status: stepStatusSchema,
	/** The named people of a MEMBERS step, by name; empty for KEY_HOLDERS. */
	members: z.array(participantSchema).default([]),
	decisions: z.array(decisionSchema).default([]),
});

export type ApprovalInstanceStep = z.infer<typeof instanceStepSchema>;
export type ApprovalStepStatus = ApprovalInstanceStep["status"];

const instanceSchema = z.object({
	approvalInstanceId: z.string(),
	subjectType: z.string(),
	/** The subject's public id: a schedule's for a publication. */
	subjectId: z.string(),
	departmentId: z.string(),
	approvalFlowId: z.string(),
	requestedBy: participantSchema.nullable(),
	status: instanceStatusSchema,
	/** The open step's order while PENDING. */
	currentStepOrder: z.number().int().nullable(),
	submittedAt: z.string(),
	decidedAt: z
		.string()
		.nullish()
		.transform((value) => value ?? null),
	steps: z.array(instanceStepSchema),
	/** Whether the caller may decide the open step now; only the single read answers it, null elsewhere. */
	canDecide: z
		.boolean()
		.nullish()
		.transform((value) => value ?? null),
	/** How many people may decide the open step now, the submitter left out; single read only. */
	eligibleCount: z
		.number()
		.int()
		.nullish()
		.transform((value) => value ?? null),
});

/** One submission: its steps, decisions and where it stands. */
export type ApprovalInstance = z.infer<typeof instanceSchema>;
export type ApprovalInstanceStatus = ApprovalInstance["status"];

const flowStepSchema = z.object({
	stepOrder: z.number().int(),
	label: z.string(),
	rule: ruleSchema,
	quorum: quorumSchema,
	members: z.array(participantSchema).default([]),
});

export type ApprovalFlowStep = z.infer<typeof flowStepSchema>;

const flowSchema = z.object({
	approvalFlowId: z.string(),
	subjectType: z.string(),
	/** Null for the company-wide flow, which applies wherever a department has none of its own. */
	departmentId: z.string().nullable(),
	name: z.string(),
	active: z.boolean(),
	steps: z.array(flowStepSchema),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** A department's (or the company's) approval flow for one subject. */
export type ApprovalFlow = z.infer<typeof flowSchema>;

/** One step as a flow write sends it; people go by membership id. */
export type ApprovalFlowStepBody = {
	label: string;
	rule: ApprovalStepRule;
	quorum: ApprovalQuorum;
	memberIds: Array<string>;
};

/** What adding a flow sends; where it applies is fixed once added. */
export type CreateApprovalFlowBody = {
	subjectType: typeof SCHEDULE_PUBLICATION;
	departmentId: string | null;
	name: string;
	steps: Array<ApprovalFlowStepBody>;
};

/** What replacing a flow sends. */
export type UpdateApprovalFlowBody = {
	name: string;
	active: boolean;
	steps: Array<ApprovalFlowStepBody>;
};

/** One decision on the step `stepOrder`; a step that closed meanwhile is refused, never decided by accident. */
export type ApprovalDecisionBody = {
	stepOrder: number;
	decision: "APPROVE" | "REJECT";
	/** Optional to approve; required to reject. */
	comment: string | null;
};

const flowsPath = (companyId: string): string =>
	`${companyPath(companyId)}/approval-flows`;
const flowPath = (companyId: string, flowId: string): string =>
	`${flowsPath(companyId)}/${encodeURIComponent(flowId)}`;
const instancesPath = (companyId: string): string =>
	`${companyPath(companyId)}/approval-instances`;
const instancePath = (companyId: string, instanceId: string): string =>
	`${instancesPath(companyId)}/${encodeURIComponent(instanceId)}`;
const myInstancesPath = (companyId: string): string =>
	`${companyPath(companyId)}/me/approval-instances`;

export const fetchApprovalFlows = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<ApprovalFlow>> =>
	apiRequest(flowsPath(companyId), z.array(flowSchema), { signal });

export const createApprovalFlow = (
	companyId: string,
	body: CreateApprovalFlowBody
): Promise<ApprovalFlow> =>
	apiRequest(flowsPath(companyId), flowSchema, { method: "POST", body });

export const updateApprovalFlow = (
	companyId: string,
	flowId: string,
	body: UpdateApprovalFlowBody
): Promise<ApprovalFlow> =>
	apiRequest(flowPath(companyId, flowId), flowSchema, { method: "PUT", body });

/** Removes a flow; rosters already waiting keep its steps. The API answers 204. */
export const deleteApprovalFlow = (
	companyId: string,
	flowId: string
): Promise<void> =>
	apiRequestVoid(flowPath(companyId, flowId), { method: "DELETE" });

/** A subject's submissions, newest first. */
export const fetchSubjectApprovals = (
	companyId: string,
	subjectId: string,
	signal?: AbortSignal
): Promise<Array<ApprovalInstance>> =>
	apiRequest(
		`${instancesPath(companyId)}?${new URLSearchParams({ subjectType: SCHEDULE_PUBLICATION, subjectId })}`,
		z.array(instanceSchema),
		{ signal }
	);

/** One submission, with whether the caller may decide it now. */
export const fetchApprovalInstance = (
	companyId: string,
	instanceId: string,
	signal?: AbortSignal
): Promise<ApprovalInstance> =>
	apiRequest(instancePath(companyId, instanceId), instanceSchema, { signal });

export const decideApproval = (
	companyId: string,
	instanceId: string,
	body: ApprovalDecisionBody
): Promise<ApprovalInstance> =>
	apiRequest(
		`${instancePath(companyId, instanceId)}/decisions`,
		instanceSchema,
		{
			method: "POST",
			body,
		}
	);

/** The open steps the caller may decide and has not answered. */
export const fetchMyPendingApprovals = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<ApprovalInstance>> =>
	apiRequest(`${myInstancesPath(companyId)}/pending`, z.array(instanceSchema), {
		signal,
	});

/** The submitter withdraws their own submission; anyone else is answered 404. */
export const withdrawMyApproval = (
	companyId: string,
	instanceId: string
): Promise<ApprovalInstance> =>
	apiRequest(
		`${myInstancesPath(companyId)}/${encodeURIComponent(instanceId)}/cancellation`,
		instanceSchema,
		{ method: "POST" }
	);

/** Every approvals query of a company sits under `approvalKeys.all`; invalidating it reloads them all. */
export const approvalKeys = {
	all: (companyId: string) => ["approvals", companyId] as const,
	flows: (companyId: string) =>
		[...approvalKeys.all(companyId), "flows"] as const,
	subject: (companyId: string, subjectId: string) =>
		[...approvalKeys.all(companyId), "subject", subjectId] as const,
	instance: (companyId: string, instanceId: string) =>
		[...approvalKeys.all(companyId), "instance", instanceId] as const,
	pending: (companyId: string) =>
		[...approvalKeys.all(companyId), "pending"] as const,
};

type Options<T, K extends ReadonlyArray<unknown>> = UndefinedInitialDataOptions<
	T,
	Error,
	T,
	K
>;

/** The company's flows; `allowed` false asks for nothing. */
export const approvalFlowsQuery = (
	companyId: string,
	allowed = true
): Options<Array<ApprovalFlow>, ReturnType<typeof approvalKeys.flows>> =>
	queryOptions({
		queryKey: approvalKeys.flows(companyId),
		queryFn: allowed
			? ({ signal }): Promise<Array<ApprovalFlow>> =>
					fetchApprovalFlows(companyId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** A schedule's submissions, newest first; `allowed` false asks for nothing. */
export const subjectApprovalsQuery = (
	companyId: string,
	subjectId: string,
	allowed = true
): Options<Array<ApprovalInstance>, ReturnType<typeof approvalKeys.subject>> =>
	queryOptions({
		queryKey: approvalKeys.subject(companyId, subjectId),
		queryFn: allowed
			? ({ signal }): Promise<Array<ApprovalInstance>> =>
					fetchSubjectApprovals(companyId, subjectId, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** One submission with the caller's `canDecide`; `instanceId` undefined asks for nothing. */
export const approvalInstanceQuery = (
	companyId: string,
	instanceId: string | undefined
): Options<ApprovalInstance, ReturnType<typeof approvalKeys.instance>> =>
	queryOptions({
		queryKey: approvalKeys.instance(companyId, instanceId ?? ""),
		queryFn: instanceId
			? ({ signal }): Promise<ApprovalInstance> =>
					fetchApprovalInstance(companyId, instanceId, signal)
			: skipToken,
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		retry,
	});

/** What waits on the caller; their own list, so it needs no key. */
export const myPendingApprovalsQuery = (
	companyId: string,
	enabled = true
): Options<Array<ApprovalInstance>, ReturnType<typeof approvalKeys.pending>> =>
	queryOptions({
		queryKey: approvalKeys.pending(companyId),
		queryFn:
			enabled && companyId
				? ({ signal }): Promise<Array<ApprovalInstance>> =>
						fetchMyPendingApprovals(companyId, signal)
				: skipToken,
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});
