import type { TFunction } from "i18next";
import { formatDay } from "@/common/formatDay";
import { mapRefusal, type Refusal } from "@/common/refusal";
import { mondayOf } from "@/common/weeks";
import type { DatesRefusal, DayRun } from "@/features/scheduling/dates/api";
import { dayCountOfRuns } from "@/features/scheduling/dates/datesSetup";
import { formatPeriod, periodStartingOn } from "@/features/scheduling/periods";

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
	weekPassed: "409 SCHEDULE_WEEK_PASSED",
	weekTaken: "409 SCHEDULE_WEEK_TAKEN",
	published: "409 SCHEDULE_PUBLISHED",
	publishedNotDeletable: "409 PUBLISHED_SCHEDULE_NOT_DELETABLE",
	invalidRejectionReason: "400 INVALID_REJECTION_REASON",
	approvalPending: "409 SCHEDULE_APPROVAL_PENDING",
	stepHasNoApprover: "400 APPROVAL_STEP_HAS_NO_APPROVER",
	notPublished: "409 SCHEDULE_NOT_PUBLISHED",
	oncePublished: "409 SCHEDULE_ONCE_PUBLISHED",
	laterPartPublished: "409 SCHEDULE_LATER_PART_PUBLISHED",
	invalidWithdrawalRemark: "400 INVALID_PUBLICATION_WITHDRAWAL_REMARK",
	weekChoiceMissing: "400 MONTH_WEEK_CHOICE_MISSING",
	weekCannotBeGenerated: "400 MONTH_WEEK_CANNOT_BE_GENERATED",
	monthNotFound: "404 SCHEDULE_MONTH_NOT_FOUND",
	datesInvalid: "400 SCHEDULE_DATES_INVALID",
	daysAllTaken: "409 SCHEDULE_DAYS_ALL_TAKEN",
	daysBeforeRoster: "409 SCHEDULE_DAYS_BEFORE_ROSTER",
	daysBeingGenerated: "409 SCHEDULE_DAYS_BEING_GENERATED",
	coveredDaysInvalid: "400 SCHEDULE_COVERED_DAYS_INVALID",
	memberNotFound: "404 SCHEDULE_MEMBER_NOT_FOUND",
	peopleDaysTaken: "409 SCHEDULE_PEOPLE_DAYS_TAKEN",
	chosenPeopleGone: "409 SCHEDULE_CHOSEN_PEOPLE_GONE",
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
			[codes.coveredDaysInvalid]: t(`${key}.coveredDaysInvalid`),
			[codes.daysBeforeRoster]: t(`${key}.daysBeforeRoster`),
			[codes.notDraft]: t(`${key}.notDraft`),
			[codes.scheduleNotFound]: t(`${key}.gone`),
			[codes.shiftNotFound]: t(`${key}.shiftGone`),
			[codes.constraintNotFound]: t(`${key}.constraintGone`),
			[codes.constraintInactive]: t(`${key}.constraintInactive`),
			[codes.departmentInactive]: t(`${key}.departmentInactive`),
			[codes.departmentNotFound]: t(`${key}.departmentGone`),
			[codes.memberNotFound]: t("scheduling.dates.refusal.memberGone"),
			[codes.peopleDaysTaken]: t("scheduling.dates.people.daysTaken"),
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

/** Why generating a withdrawn roster again through its own route was refused, as one message for its dialog. */
export const regenerationRefusal = (error: unknown, t: TFunction): string =>
	mapRefusal<never>(error, {
		alerts: {
			[codes.oncePublished]: t("scheduling.regenerate.oncePublished"),
			[codes.laterPartPublished]: t("scheduling.regenerate.laterPartPublished"),
			[codes.published]: t("scheduling.regenerate.published"),
			[codes.generationInProgress]: t("scheduling.regenerate.inProgress"),
			[codes.weekPassed]: t("scheduling.generate.weekPassed"),
		},
		forbidden: t("scheduling.create.generateForbidden"),
		failed: t("scheduling.generate.failed"),
	}).message ?? t("scheduling.generate.failed");

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

/** The bare API code of a `"<status> <errorCode>"` entry. */
const errorCodeOf = (statusAndCode: string): string =>
	statusAndCode.slice(statusAndCode.indexOf(" ") + 1);

/**
 * Why a month run took a week out of its queue: a week before it failed after
 * it was queued (the API's MonthWeekQueue). Not an error response, so no status.
 */
export const EARLIER_WEEK_FAILED = "EARLIER_WEEK_FAILED";

/** A code the app doesn't know. */
const plainGenerationFailure = (t: TFunction): string =>
	t("scheduling.generate.failed");

/**
 * The words for each refusal a month's week can meet, reusing the words of
 * generating one week. `failedWeek` names the week an EARLIER_WEEK_FAILED
 * points at; without it, that refusal reads as the plain failure.
 */
const WEEK_REFUSAL_WORDS: Record<
	string,
	(t: TFunction, failedWeek?: string) => string
> = {
	[errorCodeOf(codes.hasNoShifts)]: (t) => t("scheduling.generate.noShifts"),
	[errorCodeOf(codes.hasNoStaffing)]: (t) =>
		t("scheduling.generate.noStaffing"),
	[errorCodeOf(codes.hasNoEmployees)]: (t) =>
		t("scheduling.generate.noEmployees"),
	[errorCodeOf(codes.constraintUnusable)]: (t) =>
		t("scheduling.generate.constraintUnusable"),
	[errorCodeOf(codes.notDraft)]: (t) => t("scheduling.generate.notDraft"),
	[errorCodeOf(codes.weekAlreadyPublished)]: (t) =>
		t("scheduling.generate.weekAlreadyPublished"),
	[errorCodeOf(codes.weekTaken)]: (t) => t("scheduling.draft.weekTaken"),
	[errorCodeOf(codes.weekPassed)]: (t) => t("scheduling.generate.weekPassed"),
	[errorCodeOf(codes.generationInProgress)]: (t) =>
		t("scheduling.regenerate.inProgress"),
	[errorCodeOf(codes.published)]: (t) => t("scheduling.regenerate.published"),
	// A month run refuses every withdrawn week, told of changes or not (API ADR-0134).
	[errorCodeOf(codes.oncePublished)]: (t) =>
		t("scheduling.months.generate.oncePublished"),
	[errorCodeOf(codes.laterPartPublished)]: (t) =>
		t("scheduling.regenerate.laterPartPublished"),
	[errorCodeOf(codes.chosenPeopleGone)]: (t) =>
		t("scheduling.dates.refusal.chosenPeopleGone"),
	[EARLIER_WEEK_FAILED]: (t, failedWeek) =>
		failedWeek === undefined
			? plainGenerationFailure(t)
			: t("scheduling.months.generate.earlierWeekFailed", { week: failedWeek }),
};

/**
 * The words for an API error code met outside an error object: a week a month
 * run refused, or a week taken out of a month run's queue. `failedWeek` is the
 * failed week's dates, for EARLIER_WEEK_FAILED. A code the app doesn't know
 * reads as the plain failure.
 */
export const refusalOfCode = (
	errorCode: string,
	t: TFunction,
	failedWeek?: string
): string =>
	(WEEK_REFUSAL_WORDS[errorCode] ?? plainGenerationFailure)(t, failedWeek);

/**
 * Why generating a month was refused as a whole, as one message for the page.
 * `weekChanged` words a week that changed since the page read the month, on
 * pages without the wizard's Setup (`weekChangedRefusal`); the wizard's own
 * words send the manager back to Setup.
 */
export const monthGenerationRefusal = (
	error: unknown,
	t: TFunction,
	weekChanged?: string
): string => {
	const key = "scheduling.months.generate";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.weekChoiceMissing]: t(`${key}.choiceMissing`),
				[codes.weekCannotBeGenerated]:
					weekChanged ?? t(`${key}.weekCannotBeGenerated`),
				[codes.monthNotFound]: t("scheduling.months.page.unavailable"),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};

/**
 * Why generating dates was refused as a whole, as one message for the page.
 * The plan read words a refusal with its days first (`datesRefusalText`), so
 * one met here means the days changed since Setup read them.
 */
export const datesGenerationRefusal = (
	error: unknown,
	t: TFunction
): string => {
	const key = "scheduling.dates.refusal";
	return (
		mapRefusal<never>(error, {
			alerts: {
				[codes.datesInvalid]: t(`${key}.datesInvalid`),
				[codes.daysAllTaken]: t(`${key}.changed`),
				[codes.daysBeforeRoster]: t(`${key}.changed`),
				[codes.daysBeingGenerated]: t(`${key}.changed`),
				[codes.weekTaken]: t(`${key}.changed`),
				[codes.weekChoiceMissing]: t(
					"scheduling.months.generate.choiceMissing"
				),
				[codes.monthNotFound]: t(`${key}.unavailable`),
				[codes.memberNotFound]: t(`${key}.memberGone`),
				[codes.peopleDaysTaken]: t("scheduling.dates.people.daysTaken"),
			},
			forbidden: t(`${key}.forbidden`),
			failed: t(`${key}.failed`),
		}).message ?? t(`${key}.failed`)
	);
};

/** A run of days in the person's language, e.g. "19 – 22 Nov 2026". */
const daysText = (days: DayRun, language: string): string =>
	formatPeriod({ start: days.from, end: days.to }, language);

/**
 * Why the dates plan refuses the dates, worded with its days: every day
 * published, days to redo before published days, a schedule with no roster
 * in the way, or days being generated (API ADR-0129). A code the app doesn't
 * know reads as the plain failure. `withdrawnDays` are the asked days whose
 * roster was published and then withdrawn (`withdrawnDaysOf`): with any, the
 * every-day-published refusal names them and says how to redo or keep them.
 */
export const datesRefusalText = (
	refusal: DatesRefusal,
	t: TFunction,
	language: string,
	withdrawnDays: ReadonlyArray<DayRun> = []
): string => {
	const key = "scheduling.dates.refusal";
	const scheduled = refusal.scheduledDays ?? refusal.days;
	if (
		refusal.code === errorCodeOf(codes.daysAllTaken) &&
		withdrawnDays.length > 0
	)
		return t(`${key}.allTakenWithdrawn`, {
			days: new Intl.ListFormat(language, { type: "conjunction" }).format(
				withdrawnDays.map((run) => daysText(run, language))
			),
			count: dayCountOfRuns(withdrawnDays),
		});
	if (refusal.code === errorCodeOf(codes.daysAllTaken))
		return t(`${key}.allTaken`, {
			first: formatDay(refusal.days.from, language),
			last: formatDay(refusal.days.to, language),
		});
	if (refusal.code === errorCodeOf(codes.daysBeforeRoster))
		return t(`${key}.beforeRoster`, {
			days: daysText(refusal.days, language),
			scheduled: daysText(scheduled, language),
			last: formatDay(scheduled.to, language),
		});
	if (refusal.code === errorCodeOf(codes.weekTaken))
		return t(`${key}.draftInTheWay`, {
			week: formatPeriod(periodStartingOn(mondayOf(scheduled.from)), language),
			days: daysText(scheduled, language),
		});
	if (refusal.code === errorCodeOf(codes.daysBeingGenerated))
		return t(`${key}.beingGenerated`, {
			days: daysText(refusal.days, language),
		});
	return t(`${key}.failed`);
};
