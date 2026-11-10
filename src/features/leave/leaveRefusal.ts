import type { TFunction } from "i18next";
import { ApiProblemError } from "@/common/problem";
import { APPROVAL_REFUSAL_CODES } from "@/features/approvals/approvalRefusal";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

/** The fields an application's refusal can land on. */
export type ApplyField = "employee" | "type" | "endDate" | "notes";

/**
 * The refusals of applying for and deciding leave, as `"<status> <errorCode>"`.
 * Every code is named here once, so a code the API settles on differently
 * is a one-line change.
 */
export const LEAVE_REFUSAL_CODES = {
	/** The person already has a pending or approved request on one of the days. */
	overlaps: "409 LEAVE_REQUEST_OVERLAPS",
	/** No day of the period uses leave: none is rostered, or a weekday where no roster exists. */
	noWorkingDays: "400 LEAVE_REQUEST_NO_WORKING_DAYS",
	/** The end is before the start, or the period is over a year. */
	invalidPeriod: "400 INVALID_LEAVE_PERIOD",
	/** The request was already approved or rejected. */
	notPending: "409 LEAVE_REQUEST_NOT_PENDING",
	/** Not a live request of this person. */
	requestNotFound: "404 LEAVE_REQUEST_NOT_FOUND",
	/** Nobody, or nobody the person may see. */
	profileNotFound: "404 MEMBER_PROFILE_NOT_FOUND",
	invalidReason: "400 INVALID_REJECTION_REASON",
	/** The approval comment is over 2,000 characters or holds a control character. */
	invalidComment: "400 INVALID_APPROVAL_COMMENT",
	/** The leave reaches back before the member's today and no approval comment says why. */
	commentRequiredForPastDays: "400 LEAVE_COMMENT_REQUIRED_FOR_PAST_DAYS",
	/** The remarks are over 1,000 characters or hold a control character. */
	invalidNotes: "400 INVALID_LEAVE_NOTES",
	/** The leave type asks for a reason and none was written. */
	notesRequired: "400 LEAVE_NOTES_REQUIRED",
	/** The leave type is unknown, no longer offered, or the scheduler's own. */
	typeNotAvailable: "400 LEAVE_TYPE_NOT_AVAILABLE",
	/** Nobody decides their own leave, whatever their roles; reloading roles cannot change it. */
	ownReview: "403 OWN_LEAVE_REVIEW_DENIED",
	/** The days hold shifts and nobody confirmed taking the person off them. */
	rosterClash: "409 LEAVE_CLASHES_WITH_ROSTER",
	/** The request is no longer approved. */
	notApproved: "409 LEAVE_REQUEST_NOT_APPROVED",
	/** The change asks for what the request already holds. */
	changeEmpty: "400 LEAVE_CHANGE_EMPTY",
	/** The remark is missing or breaks the rule. */
	invalidRemark: "400 INVALID_LEAVE_REMARK",
	/** The request waits on an approval flow, so it is decided on its open step, not in one review. */
	approvalPending: "409 LEAVE_APPROVAL_PENDING",
} as const;

const codes = LEAVE_REFUSAL_CODES;
const approvalCodes = APPROVAL_REFUSAL_CODES;

const codeOf = (error: unknown): string | undefined =>
	error instanceof ApiProblemError
		? `${error.status} ${error.errorCode ?? ""}`
		: undefined;

/**
 * Whether a decision was refused because the request moved on since the
 * screen read it: a flow started, or another approver decided the step.
 * The screen reads the request again.
 */
export const isStaleDecision = (error: unknown): boolean => {
	const code = codeOf(error);
	return (
		code === codes.approvalPending ||
		code === codes.notPending ||
		code === approvalCodes.stepDecided ||
		code === approvalCodes.notPending
	);
};

/** Whether the API refused because the days hold shifts nobody confirmed. */
export const isRosterClash = (error: unknown): boolean =>
	codeOf(error) === codes.rosterClash;

/**
 * Why applying on a person's behalf was refused: on the type, the dates, the
 * remarks or the employee, or as the dialog's alert. Server codes select frontend-owned
 * copy; untrusted server prose is never displayed.
 */
export const applyRefusal = (
	error: unknown,
	t: TFunction
): Refusal<ApplyField> => {
	const key = "leave.refusal";
	const dates = (message: string) => ({ field: "endDate", message }) as const;
	const notes = { field: "notes", message: t(`${key}.notesRejected`) } as const;
	const type = {
		field: "type",
		message: t(`${key}.typeNotAvailable`),
	} as const;
	return mapRefusal<ApplyField>(error, {
		codes: {
			[codes.overlaps]: dates(t(`${key}.overlaps`)),
			[codes.noWorkingDays]: dates(t(`${key}.noWorkingDays`)),
			[codes.invalidPeriod]: dates(t(`${key}.invalidPeriod`)),
			[codes.invalidNotes]: notes,
			[codes.notesRequired]: {
				field: "notes",
				message: t(`${key}.reasonRequired`),
			},
			[codes.typeNotAvailable]: type,
			[codes.invalidRemark]: notes,
			[codes.rosterClash]: dates(t(`${key}.rosterClash`)),
			[codes.ownReview]: {
				field: "employee",
				message: t(`${key}.ownReview`),
			},
			[codes.profileNotFound]: {
				field: "employee",
				message: t(`${key}.profileMissing`),
				refreshMembers: true,
			},
		},
		alerts: {
			// The department's leave flow has a step nobody may decide, so no application can start it.
			[approvalCodes.stepHasNoApprover]: t(`${key}.noApprover`),
		},
		fieldErrors: {
			startDate: dates(t(`${key}.invalidPeriod`)),
			endDate: dates(t(`${key}.invalidPeriod`)),
			leaveType: type,
			notes,
		},
		forbidden: t(`${key}.forbiddenApply`),
		failed: t(`${key}.applyFailed`),
	});
};

/** The fields a decision's refusal can land on: the reject reason or the approval comment. */
export type DecisionField = "reason" | "comment";

/**
 * Why approving or rejecting was refused, for the dialog that asked. A
 * refused reason or comment lands on its field; everything else is the alert.
 * A request under a flow is decided through the approvals API, whose
 * refusals are worded here too.
 */
export const leaveDecisionRefusal = (
	error: unknown,
	t: TFunction
): Refusal<DecisionField> => {
	const key = "leave.refusal";
	const reason = {
		field: "reason",
		message: t(`${key}.reasonRejected`),
	} as const;
	const comment = {
		field: "comment",
		message: t(`${key}.commentRejected`),
	} as const;
	return mapRefusal<DecisionField>(error, {
		codes: {
			[codes.invalidReason]: reason,
			[codes.invalidComment]: comment,
			[codes.commentRequiredForPastDays]: {
				field: "comment",
				message: t("leave.commentMissing"),
			},
		},
		alerts: {
			[codes.notPending]: t(`${key}.notPending`),
			[codes.requestNotFound]: t(`${key}.requestMissing`),
			[codes.profileNotFound]: t(`${key}.profileMissing`),
			[codes.ownReview]: t(`${key}.ownReview`),
			[codes.rosterClash]: t(`${key}.rosterClash`),
			[codes.approvalPending]: t(`${key}.approvalPending`),
			[approvalCodes.stepDecided]: t(`${key}.stepDecided`),
			[approvalCodes.notPending]: t(`${key}.stepDecided`),
			[approvalCodes.notAnApprover]: t(`${key}.notAnApprover`),
			[approvalCodes.ownApproval]: t(`${key}.ownReview`),
			[approvalCodes.instanceNotFound]: t(`${key}.requestMissing`),
		},
		fieldErrors: { reason, comment },
		forbidden: t(`${key}.forbiddenDecide`),
		failed: t(`${key}.decideFailed`),
	});
};

/**
 * Why a change, a cancellation or a withdrawal was refused, as one line for its
 * confirmation. Server codes select frontend-owned copy.
 */
export const changeRefusal = (error: unknown, t: TFunction): string => {
	const key = "leave.refusal";
	const refusal = mapRefusal<never>(error, {
		alerts: {
			[codes.overlaps]: t(`${key}.overlaps`),
			[codes.invalidPeriod]: t(`${key}.invalidPeriod`),
			[codes.typeNotAvailable]: t(`${key}.typeNotAvailable`),
			[codes.invalidRemark]: t(`${key}.remarkRejected`),
			[codes.rosterClash]: t(`${key}.rosterClash`),
			[codes.notApproved]: t(`${key}.notApproved`),
			[codes.notPending]: t(`${key}.notPending`),
			[codes.changeEmpty]: t(`${key}.changeEmpty`),
			[codes.requestNotFound]: t(`${key}.requestMissing`),
			[codes.ownReview]: t(`${key}.ownChange`),
		},
		forbidden: t(`${key}.forbiddenChange`),
		failed: t(`${key}.changeFailed`),
	});
	return refusal.message ?? t(`${key}.changeFailed`);
};
