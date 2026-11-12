import type { TFunction } from "i18next";
import { mapRefusal, type Refusal } from "@/common/refusal";

/**
 * The refusals of the schedules API, as `"<status> <errorCode>"`. Every code
 * is named here once, so a code the API settles on differently is a
 * one-line change.
 */
export const SCHEDULE_REFUSAL_CODES = {
	periodNotMonday: "400 SCHEDULE_PERIOD_NOT_MONDAY",
	invalidName: "400 INVALID_SCHEDULE_NAME",
	notDraft: "409 SCHEDULE_NOT_DRAFT",
	isDraft: "409 SCHEDULE_IS_DRAFT",
	generationInProgress: "409 SCHEDULE_GENERATION_IN_PROGRESS",
	hasNoShifts: "409 SCHEDULE_HAS_NO_SHIFTS",
	hasNoStaffing: "409 SCHEDULE_HAS_NO_STAFFING_CONSTRAINT",
	hasNoEmployees: "409 SCHEDULE_HAS_NO_EMPLOYEES",
	constraintUnusable: "409 SCHEDULE_CONSTRAINT_UNUSABLE",
	scheduleNotFound: "404 SCHEDULE_NOT_FOUND",
	shiftNotFound: "404 SHIFT_NOT_FOUND",
	constraintNotFound: "404 CONSTRAINT_NOT_FOUND",
	constraintInactive: "409 CONSTRAINT_INACTIVE",
	departmentInactive: "409 DEPARTMENT_INACTIVE",
	departmentNotFound: "404 DEPARTMENT_NOT_FOUND",
	notGenerated: "409 SCHEDULE_NOT_GENERATED",
	alreadyDecided: "409 SCHEDULE_ALREADY_DECIDED",
	weekAlreadyPublished: "409 SCHEDULE_WEEK_ALREADY_PUBLISHED",
	weekTaken: "409 SCHEDULE_WEEK_TAKEN",
	earlierWeekUnpublished: "409 SCHEDULE_EARLIER_WEEK_UNPUBLISHED",
	published: "409 SCHEDULE_PUBLISHED",
	publishedNotDeletable: "409 PUBLISHED_SCHEDULE_NOT_DELETABLE",
	invalidRejectionReason: "400 INVALID_REJECTION_REASON",
	approvalPending: "409 SCHEDULE_APPROVAL_PENDING",
	stepHasNoApprover: "400 APPROVAL_STEP_HAS_NO_APPROVER",
	notPublished: "409 SCHEDULE_NOT_PUBLISHED",
	oncePublished: "409 SCHEDULE_ONCE_PUBLISHED",
	invalidWithdrawalRemark: "400 INVALID_PUBLICATION_WITHDRAWAL_REMARK",
} as const;

const codes = SCHEDULE_REFUSAL_CODES;

/** The setup fields a refused save can land on. */
export type ScheduleField = "name" | "periodStart";

/**
 * Why creating or saving a draft was refused: on a setup field, or as one
 * message. `creating` picks the copy for a draft that does not exist yet.
 */
export const scheduleRefusal = (
	error: unknown,
	creating: boolean,
	t: TFunction
): Refusal<ScheduleField> => {
	const key = "scheduling.draft";
	const field = (field: ScheduleField, message: string) =>
		({ field, message }) as const;
	return mapRefusal<ScheduleField>(error, {
		codes: {
			[codes.periodNotMonday]: field("periodStart", t(`${key}.periodRejected`)),
			[codes.invalidName]: field("name", t(`${key}.nameRejected`)),
			[codes.weekTaken]: field("periodStart", t(`${key}.weekTaken`)),
		},
		alerts: {
			[codes.notDraft]: t(`${key}.notDraft`),
			[codes.scheduleNotFound]: t(`${key}.gone`),
			[codes.shiftNotFound]: t(`${key}.shiftGone`),
			[codes.constraintNotFound]: t(`${key}.constraintGone`),
			[codes.constraintInactive]: t(`${key}.constraintInactive`),
			[codes.departmentInactive]: t(`${key}.departmentInactive`),
			[codes.departmentNotFound]: t(`${key}.departmentGone`),
		},
		fieldErrors: {
			name: field("name", t(`${key}.nameRejected`)),
			periodStart: field("periodStart", t(`${key}.periodRejected`)),
		},
		forbidden: t(creating ? `${key}.createForbidden` : `${key}.saveForbidden`),
		failed: t(creating ? `${key}.createFailed` : `${key}.saveFailed`),
	});
};

/** A refusal as one message, for where a field can't show it (e.g. Save Draft). */
export const scheduleRefusalMessage = (
	error: unknown,
	creating: boolean,
	t: TFunction
): string => {
	const refusal = scheduleRefusal(error, creating, t);
	return (
		refusal.message ??
		Object.values(refusal.fields)[0] ??
		t(
			creating ? "scheduling.draft.createFailed" : "scheduling.draft.saveFailed"
		)
	);
};

/** Why requesting generation was refused, as one message for the page. */
export const generationRefusal = (error: unknown, t: TFunction): string => {
	const key = "scheduling.generate";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.hasNoShifts]: t(`${key}.noShifts`),
				[codes.hasNoStaffing]: t(`${key}.noStaffing`),
				[codes.hasNoEmployees]: t(`${key}.noEmployees`),
				[codes.constraintUnusable]: t(`${key}.constraintUnusable`),
				[codes.notDraft]: t(`${key}.notDraft`),
				[codes.weekAlreadyPublished]: t(`${key}.weekAlreadyPublished`),
				[codes.scheduleNotFound]: t("scheduling.draft.gone"),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};

/** Why deleting a schedule was refused, as one message for its dialog. */
export const deleteRefusal = (error: unknown, t: TFunction): string => {
	const key = "scheduling.delete";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.generationInProgress]: t(`${key}.inProgress`),
				[codes.publishedNotDeletable]: t(`${key}.published`),
				[codes.scheduleNotFound]: t(`${key}.gone`),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};

/** Why regenerating a schedule was refused, as one message for its dialog. */
export const regenerationRefusal = (error: unknown, t: TFunction): string => {
	const key = "scheduling.regenerate";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.isDraft]: t(`${key}.draft`),
				[codes.generationInProgress]: t(`${key}.inProgress`),
				[codes.published]: t(`${key}.published`),
				[codes.oncePublished]: t(`${key}.oncePublished`),
				[codes.weekAlreadyPublished]: t(`${key}.weekAlreadyPublished`),
				[codes.hasNoEmployees]: t("scheduling.generate.noEmployees"),
				[codes.scheduleNotFound]: t("scheduling.delete.gone"),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};

/** The field a refused rejection can land on. */
export type RejectionField = "reason";

/**
 * Why publishing, submitting or rejecting a schedule was refused: an invalid
 * reason on the reason field, otherwise one message for the dialog. While a
 * submission waits, publishing or rejecting directly is refused.
 */
export const decisionRefusal = (
	error: unknown,
	t: TFunction
): Refusal<RejectionField> => {
	const key = "scheduling.decision.refusal";
	const reason = {
		field: "reason",
		message: t(`${key}.reasonRejected`),
	} as const;
	return mapRefusal<RejectionField>(error, {
		codes: { [codes.invalidRejectionReason]: reason },
		alerts: {
			[codes.generationInProgress]: t(`${key}.inProgress`),
			[codes.notGenerated]: t(`${key}.notGenerated`),
			[codes.alreadyDecided]: t(`${key}.alreadyDecided`),
			[codes.weekAlreadyPublished]: t(`${key}.weekAlreadyPublished`),
			[codes.earlierWeekUnpublished]: t(`${key}.earlierWeekUnpublished`),
			[codes.scheduleNotFound]: t("scheduling.delete.gone"),
			[codes.approvalPending]: t(`${key}.approvalPending`),
			[codes.stepHasNoApprover]: t(`${key}.noApprover`),
		},
		fieldErrors: { reason },
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
};

/** The field a refused withdrawal can land on. */
export type WithdrawalField = "remark";

/**
 * Why withdrawing a roster's publication was refused: an invalid remark on
 * the remark field, otherwise one message for the dialog.
 */
export const withdrawalRefusal = (
	error: unknown,
	t: TFunction
): Refusal<WithdrawalField> => {
	const key = "scheduling.decision.refusal";
	const remark = {
		field: "remark",
		message: t(`${key}.remarkRejected`),
	} as const;
	return mapRefusal<WithdrawalField>(error, {
		codes: { [codes.invalidWithdrawalRemark]: remark },
		alerts: {
			[codes.notPublished]: t(`${key}.notPublished`),
			[codes.generationInProgress]: t(`${key}.inProgress`),
			[codes.scheduleNotFound]: t("scheduling.delete.gone"),
		},
		fieldErrors: { remark },
		forbidden: t(`${key}.withdrawForbidden`),
		failed: t(`${key}.failed`),
	});
};
