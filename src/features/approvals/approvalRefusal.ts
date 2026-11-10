import type { TFunction } from "i18next";
import { z } from "zod";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal, refusalCodeOf, type Refusal } from "@/common/refusal";

/**
 * The refusals of the approvals API, as `"<status> <errorCode>"`, each named
 * once (hrms-backend-v2 `features/approvals/exceptions`).
 */
export const APPROVAL_REFUSAL_CODES = {
	invalidComment: "400 INVALID_APPROVAL_COMMENT",
	invalidFlow: "400 INVALID_APPROVAL_FLOW",
	stepHasNoApprover: "400 APPROVAL_STEP_HAS_NO_APPROVER",
	flowHasNoApprover: "400 APPROVAL_FLOW_HAS_NO_APPROVER",
	ownApproval: "403 OWN_APPROVAL_DENIED",
	notAnApprover: "403 NOT_AN_APPROVER",
	flowNotFound: "404 APPROVAL_FLOW_NOT_FOUND",
	instanceNotFound: "404 APPROVAL_INSTANCE_NOT_FOUND",
	flowExists: "409 APPROVAL_FLOW_ALREADY_EXISTS",
	notPending: "409 APPROVAL_NOT_PENDING",
	stepDecided: "409 APPROVAL_STEP_ALREADY_DECIDED",
} as const;

const codes = APPROVAL_REFUSAL_CODES;

/** The field a refused decision can land on. */
export type DecisionField = "comment";

/** Why approving or rejecting a step was refused: an invalid comment on its field, otherwise one message. */
export const approvalDecisionRefusal = (
	error: unknown,
	t: TFunction
): Refusal<DecisionField> => {
	const key = "approvals.refusal";
	return mapRefusal<DecisionField>(error, {
		codes: {
			[codes.invalidComment]: {
				field: "comment",
				message: t(`${key}.invalidComment`),
			},
		},
		alerts: {
			[codes.stepDecided]: t(`${key}.decidedFirst`),
			[codes.notPending]: t(`${key}.decidedFirst`),
			[codes.notAnApprover]: t(`${key}.notAnApprover`),
			[codes.ownApproval]: t(`${key}.ownApproval`),
			[codes.instanceNotFound]: t(`${key}.gone`),
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};

/** Why withdrawing a submission was refused, as one message. */
export const withdrawRefusal = (error: unknown, t: TFunction): string => {
	const key = "approvals.refusal";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.notPending]: t(`${key}.decidedFirst`),
				[codes.instanceNotFound]: t(`${key}.gone`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.withdrawFailed`),
		}).message ?? t(`${key}.withdrawFailed`)
	);
};

/** The flow dialog's fields a refused save can land on. */
export type FlowField = "departmentId";

/** Where a flow that is on would have a step nobody may approve: the refusal's `departments` extension. */
const unapprovableSchema = z.object({
	departments: z
		.array(
			z.object({
				departmentName: z.string(),
				stepOrders: z.array(z.number().int()),
			})
		)
		.min(1),
});

/**
 * "Nobody can approve step 2 in Front Office. … Give people “Decide
 * approvals” there …", from a refusal naming where a flow can't be
 * approved; undefined for any other error, or a body this app can't read.
 */
const unapprovableMessage = (
	error: unknown,
	t: TFunction
): string | undefined => {
	if (
		!(error instanceof ApiProblemError) ||
		refusalCodeOf(error) !== codes.flowHasNoApprover
	)
		return undefined;
	const parsed = unapprovableSchema.safeParse(error.body);
	if (!parsed.success) return undefined;
	const key = "approvals.flows.refusal";
	return [
		...parsed.data.departments.map((department) =>
			t(`${key}.noApproverIn`, {
				count: department.stepOrders.length,
				steps: department.stepOrders.join(", "),
				department: department.departmentName,
			})
		),
		t(`${key}.noApproverFix`),
	].join(" ");
};

/**
 * Why saving a flow was refused: a unit that already has one on its field,
 * where a step has nobody to approve it, otherwise one message.
 */
export const flowRefusal = (
	error: unknown,
	t: TFunction
): Refusal<FlowField> => {
	const key = "approvals.flows.refusal";
	const unapprovable = unapprovableMessage(error, t);
	if (unapprovable)
		return { fields: {}, message: unapprovable, refreshMembers: false };
	return mapRefusal<FlowField>(error, {
		codes: {
			[codes.flowExists]: {
				field: "departmentId",
				message: t(`${key}.exists`),
			},
		},
		alerts: {
			[codes.invalidFlow]: t(`${key}.invalid`),
			[codes.stepHasNoApprover]: t(`${key}.noApprover`),
			[codes.flowHasNoApprover]: t(`${key}.noApprover`),
			[codes.flowNotFound]: t(`${key}.gone`),
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};

/** Why turning a flow on or off, or deleting it, was refused, as one message. */
export const flowChangeRefusal = (error: unknown, t: TFunction): string => {
	const key = "approvals.flows.refusal";
	return (
		unapprovableMessage(error, t) ??
		mapRefusal<never>(error, {
			alerts: {
				[codes.flowExists]: t(`${key}.existsOnTurnOn`),
				[codes.flowHasNoApprover]: t(`${key}.noApprover`),
				[codes.flowNotFound]: t(`${key}.gone`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ??
		t(`${key}.failed`)
	);
};
