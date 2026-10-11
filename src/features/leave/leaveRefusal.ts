import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";

/** The fields an application's refusal can land on. */
export type ApplyField = "employee" | "endDate";

/**
 * The refusals of applying for and deciding leave, as `"<status> <errorCode>"`.
 * Every code is named here once, so a code the API settles on differently
 * is a one-line change.
 */
export const LEAVE_REFUSAL_CODES = {
	/** The person already has a pending or approved request on one of the days. */
	overlaps: "409 LEAVE_REQUEST_OVERLAPS",
	/** The period holds only weekend days. */
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
	/** Nobody decides their own leave, whatever their roles; reloading roles cannot change it. */
	ownReview: "403 OWN_LEAVE_REVIEW_DENIED",
} as const;

const codes = LEAVE_REFUSAL_CODES;

/**
 * Why applying on a person's behalf was refused: on the dates or the
 * employee, or as the dialog's alert. Server codes select frontend-owned
 * copy; untrusted server prose is never displayed.
 */
export const applyRefusal = (
	error: unknown,
	t: TFunction
): Refusal<ApplyField> => {
	const key = "leave.refusal";
	const dates = (message: string) => ({ field: "endDate", message }) as const;
	return mapRefusal<ApplyField>(error, {
		codes: {
			[codes.overlaps]: dates(t(`${key}.overlaps`)),
			[codes.noWorkingDays]: dates(t(`${key}.noWorkingDays`)),
			[codes.invalidPeriod]: dates(t(`${key}.invalidPeriod`)),
			[codes.profileNotFound]: {
				field: "employee",
				message: t(`${key}.profileMissing`),
				refreshMembers: true,
			},
		},
		fieldErrors: {
			startDate: dates(t(`${key}.invalidPeriod`)),
			endDate: dates(t(`${key}.invalidPeriod`)),
		},
		forbidden: t(`${key}.forbiddenApply`),
		failed: t(`${key}.applyFailed`),
	});
};

/**
 * Why approving or rejecting was refused, for the dialog that asked. A
 * rejected reason lands on the reason field; everything else is the alert.
 */
export const decisionRefusal = (
	error: unknown,
	t: TFunction
): Refusal<"reason"> => {
	const key = "leave.refusal";
	const reason = {
		field: "reason",
		message: t(`${key}.reasonRejected`),
	} as const;
	return mapRefusal<"reason">(error, {
		codes: { [codes.invalidReason]: reason },
		alerts: {
			[codes.notPending]: t(`${key}.notPending`),
			[codes.requestNotFound]: t(`${key}.requestMissing`),
			[codes.profileNotFound]: t(`${key}.profileMissing`),
			[codes.ownReview]: t(`${key}.ownReview`),
		},
		fieldErrors: { reason },
		forbidden: t(`${key}.forbiddenDecide`),
		failed: t(`${key}.decideFailed`),
	});
};
