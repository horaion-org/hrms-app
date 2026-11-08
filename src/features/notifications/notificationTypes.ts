import type { ParseKeys } from "i18next";
import type { Heroicon } from "@/common/types";
import {
	ApproveRequestsIcon,
	CrossIcon,
	FillShiftsIcon,
	InfoIcon,
	PublishIcon,
	SchedulingIcon,
	SwapIcon,
	TickIcon,
	TimeIcon,
	UploadIcon,
} from "@/components/ui/Icon";
import type { InboxNotification } from "@/features/notifications/api";
import { formatOfferTime } from "@/features/scheduling/coverOffers/coverOfferRules";
import { formatDay } from "@/features/scheduling/periods";

/** Warning asks the reader to act, success and error are outcomes, info is a fact, neutral is unrecognised. */
export type NotificationTone =
	"info" | "success" | "warning" | "error" | "neutral";

export type NotificationCategory = "leave" | "schedule" | "people" | "other";

/** How one notification type looks in the inbox. The wording lives in the locales under `notifications.types`. */
export type NotificationTypeDescriptor = {
	icon: Heroicon;
	tone: NotificationTone;
	category: NotificationCategory;
	title: ParseKeys;
};

/**
 * Every type the app can present. Adding a type means adding one entry and its `notifications.types` copy; a type
 * whose look depends on its payload (a finished import) also gets a case in `presentNotification`.
 */
const NOTIFICATION_TYPES = {
	LEAVE_REQUEST_SUBMITTED: {
		icon: ApproveRequestsIcon,
		tone: "warning",
		category: "leave",
		title: "notifications.types.LEAVE_REQUEST_SUBMITTED",
	},
	LEAVE_REQUEST_APPROVED: {
		icon: TickIcon,
		tone: "success",
		category: "leave",
		title: "notifications.types.LEAVE_REQUEST_APPROVED",
	},
	LEAVE_REQUEST_REJECTED: {
		icon: CrossIcon,
		tone: "error",
		category: "leave",
		title: "notifications.types.LEAVE_REQUEST_REJECTED",
	},
	LEAVE_REQUEST_RECORDED: {
		icon: TickIcon,
		tone: "success",
		category: "leave",
		title: "notifications.types.LEAVE_REQUEST_RECORDED",
	},
	LEAVE_REQUEST_CHANGED: {
		icon: TickIcon,
		tone: "warning",
		category: "leave",
		title: "notifications.types.LEAVE_REQUEST_CHANGED",
	},
	LEAVE_REQUEST_CANCELLED: {
		icon: CrossIcon,
		tone: "warning",
		category: "leave",
		title: "notifications.types.LEAVE_REQUEST_CANCELLED",
	},
	SCHEDULE_READY: {
		icon: PublishIcon,
		tone: "warning",
		category: "schedule",
		title: "notifications.types.SCHEDULE_READY",
	},
	SHIFT_ASSIGNMENT: {
		icon: SchedulingIcon,
		tone: "info",
		category: "schedule",
		title: "notifications.types.SHIFT_ASSIGNMENT",
	},
	SCHEDULE_ASSIGNMENT_UPDATED: {
		icon: SwapIcon,
		tone: "info",
		category: "schedule",
		title: "notifications.types.SCHEDULE_ASSIGNMENT_UPDATED",
	},
	SCHEDULE_PUBLICATION_WITHDRAWN: {
		icon: SchedulingIcon,
		tone: "warning",
		category: "schedule",
		title: "notifications.types.SCHEDULE_PUBLICATION_WITHDRAWN",
	},
	ROSTER_DAY_NEEDS_DECISION: {
		icon: SchedulingIcon,
		tone: "warning",
		category: "schedule",
		title: "notifications.types.ROSTER_DAY_NEEDS_DECISION",
	},
	SCHEDULE_REJECTED: {
		icon: CrossIcon,
		tone: "error",
		category: "schedule",
		title: "notifications.types.SCHEDULE_REJECTED",
	},
	// The row names no step or outcome: the API sends only the approval's ids (see approvals P2 handover).
	APPROVAL_REQUESTED: {
		icon: ApproveRequestsIcon,
		tone: "warning",
		category: "schedule",
		title: "approvals.notifications.requested",
	},
	APPROVAL_DECIDED: {
		icon: PublishIcon,
		tone: "info",
		category: "schedule",
		title: "approvals.notifications.decided",
	},
	COVER_OFFER_SENT: {
		icon: FillShiftsIcon,
		tone: "warning",
		category: "schedule",
		title: "notifications.types.COVER_OFFER_SENT",
	},
	COVER_OFFER_ANSWERED: {
		icon: FillShiftsIcon,
		tone: "info",
		category: "schedule",
		title: "notifications.types.COVER_OFFER_ANSWERED",
	},
	MEMBER_IMPORT_FINISHED: {
		icon: UploadIcon,
		tone: "success",
		category: "people",
		title: "notifications.types.MEMBER_IMPORT_FINISHED",
	},
} as const satisfies Record<string, NotificationTypeDescriptor>;

export type KnownNotificationType = keyof typeof NOTIFICATION_TYPES;

/** A type this build does not know yet (for example one added by a newer API) still renders, plainly. */
export const UNKNOWN_NOTIFICATION_TYPE: NotificationTypeDescriptor = {
	icon: InfoIcon,
	tone: "neutral",
	category: "other",
	title: "notifications.types.unknown",
};

export const isKnownNotificationType = (
	type: string
): type is KnownNotificationType =>
	Object.prototype.hasOwnProperty.call(NOTIFICATION_TYPES, type);

export const describeNotificationType = (
	type: string
): NotificationTypeDescriptor =>
	isKnownNotificationType(type)
		? NOTIFICATION_TYPES[type]
		: UNKNOWN_NOTIFICATION_TYPE;

/** How one notification reads: its type's look, adjusted by its payload, and the values its copy needs. */
export type NotificationPresentation = NotificationTypeDescriptor & {
	values: Record<string, number | string> | undefined;
};

/** What a row's copy needs to word dates and times: the person's language and the clock. */
export type NotificationWording = { language: string; now: Date };

/** How an answered cover offer reads: an accepted one is good news; a decline or no answer leaves the gap. */
const COVER_OFFER_OUTCOMES = {
	ACCEPTED: {
		icon: TickIcon,
		tone: "success",
		title: "notifications.coverOffer.accepted",
	},
	DECLINED: {
		icon: CrossIcon,
		tone: "warning",
		title: "notifications.coverOffer.declined",
	},
	EXPIRED: {
		icon: TimeIcon,
		tone: "warning",
		title: "notifications.coverOffer.expired",
	},
} as const satisfies Record<
	string,
	Pick<NotificationTypeDescriptor, "icon" | "tone" | "title">
>;

/**
 * A cover offer row: the offer's day and, while it is sent, its deadline;
 * an answer takes its look from the outcome. Without the offer's facts (or
 * the wording) it reads as its type alone.
 */
const presentCoverOffer = (
	descriptor: NotificationTypeDescriptor,
	notification: Pick<InboxNotification, "type" | "coverOffer">,
	wording: NotificationWording | undefined
): NotificationPresentation => {
	const offer = notification.coverOffer;
	if (!offer) return { ...descriptor, values: undefined };
	const day = wording ? formatDay(offer.rosterDate, wording.language) : "";
	if (notification.type === "COVER_OFFER_SENT")
		return wording && offer.expiresAt
			? {
					...descriptor,
					title: "notifications.coverOffer.sent",
					values: {
						day,
						time: formatOfferTime(
							offer.expiresAt,
							wording.language,
							undefined,
							wording.now
						),
					},
				}
			: { ...descriptor, values: undefined };
	const outcome = offer.outcome
		? COVER_OFFER_OUTCOMES[offer.outcome]
		: undefined;
	if (!outcome) return { ...descriptor, values: undefined };
	return wording
		? { ...descriptor, ...outcome, values: { day } }
		: {
				...descriptor,
				icon: outcome.icon,
				tone: outcome.tone,
				values: undefined,
			};
};

/**
 * A notification's look and copy. Most follow their type alone; a finished import turns red, and says it stopped,
 * when rows failed or the import itself failed, and its copy carries the counts. A cover offer's copy names its day
 * and deadline, worded with `wording`, and an answer's look follows its outcome.
 */
export const presentNotification = (
	notification: Pick<InboxNotification, "type" | "importCounts" | "coverOffer">,
	wording?: NotificationWording
): NotificationPresentation => {
	const descriptor = describeNotificationType(notification.type);
	if (
		notification.type === "COVER_OFFER_SENT" ||
		notification.type === "COVER_OFFER_ANSWERED"
	)
		return presentCoverOffer(descriptor, notification, wording);
	const counts = notification.importCounts;
	if (notification.type !== "MEMBER_IMPORT_FINISHED" || !counts)
		return { ...descriptor, values: undefined };
	const stopped = counts.status === "FAILED";
	return {
		...descriptor,
		tone: stopped || counts.failed > 0 ? "error" : descriptor.tone,
		title: stopped
			? "notifications.importResult.stopped"
			: "notifications.importResult.finished",
		values: {
			added: counts.added,
			skipped: counts.skipped,
			failed: counts.failed,
		},
	};
};

/**
 * Where a notification opens: a leave request on `/leave`, a schedule's roster on the scheduling page (with its
 * approval open, for an approval), the member's own view of a roster they are on, or an import's result.
 */
export type NotificationTarget =
	| { kind: "leave"; requestId: string; memberId: string | undefined }
	| { kind: "schedule"; scheduleId: string; day: string | undefined }
	| { kind: "myRoster"; scheduleId: string }
	| { kind: "approval"; scheduleId: string }
	| { kind: "offer"; scheduleId: string; offerId: string }
	| { kind: "import"; importId: string };

/**
 * Schedule notifications sent to the members a roster names, who may not hold `schedule:read`: they open the
 * member's own view of the roster. The deciders' and requesters' schedule notifications keep the scheduling page.
 */
const ROSTERED_MEMBER_TYPES: ReadonlyArray<string> = [
	"SHIFT_ASSIGNMENT",
	"SCHEDULE_ASSIGNMENT_UPDATED",
	"SCHEDULE_PUBLICATION_WITHDRAWN",
];

/**
 * The page a notification opens, or undefined when it names nothing this build can open. Reviewers of leave also
 * get the beneficiary, which the review dialog needs.
 */
export const notificationTarget = (
	notification: Pick<
		InboxNotification,
		| "type"
		| "leaveRequestId"
		| "membershipId"
		| "scheduleId"
		| "memberImportJobId"
		| "rosterDay"
		| "approvalSubjectType"
		| "approvalSubjectId"
		| "coverOfferId"
	>,
	audience: "PERSONAL" | "REVIEW"
): NotificationTarget | undefined => {
	const category = describeNotificationType(notification.type).category;
	// An approval of a schedule's publication opens that roster with its trail beside it.
	if (
		notification.approvalSubjectType === "SCHEDULE_PUBLICATION" &&
		notification.approvalSubjectId
	)
		return { kind: "approval", scheduleId: notification.approvalSubjectId };
	// An offer opens the member's roster with its card, whatever has happened to it since.
	if (
		notification.type === "COVER_OFFER_SENT" &&
		notification.scheduleId &&
		notification.coverOfferId
	)
		return {
			kind: "offer",
			scheduleId: notification.scheduleId,
			offerId: notification.coverOfferId,
		};
	if (category === "leave" && notification.leaveRequestId)
		return {
			kind: "leave",
			requestId: notification.leaveRequestId,
			memberId:
				audience === "REVIEW"
					? (notification.membershipId ?? undefined)
					: undefined,
		};
	if (category === "schedule" && notification.scheduleId)
		return ROSTERED_MEMBER_TYPES.includes(notification.type)
			? { kind: "myRoster", scheduleId: notification.scheduleId }
			: {
					kind: "schedule",
					scheduleId: notification.scheduleId,
					day: notification.rosterDay ?? undefined,
				};
	if (category === "people" && notification.memberImportJobId)
		return { kind: "import", importId: notification.memberImportJobId };
	return undefined;
};
