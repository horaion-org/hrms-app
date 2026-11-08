import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

/**
 * The refusals of the approvals API, as `"<status> <errorCode>"`, each named
 * once (hrms-backend-v2 `features/approvals/exceptions`).
 */
export const APPROVAL_REFUSAL_CODES = {
	invalidComment: "400 INVALID_APPROVAL_COMMENT",
	invalidFlow: "400 INVALID_APPROVAL_FLOW",
	stepHasNoApprover: "400 APPROVAL_STEP_HAS_NO_APPROVER",
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
export const decisionRefusal = (
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

/** Why saving a flow was refused: a unit that already has one on its field, otherwise one message. */
export const flowRefusal = (
	error: unknown,
	t: TFunction
): Refusal<FlowField> => {
	const key = "approvals.flows.refusal";
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
		mapRefusal<never>(error, {
			alerts: {
				[codes.flowExists]: t(`${key}.existsOnTurnOn`),
				[codes.flowNotFound]: t(`${key}.gone`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};
