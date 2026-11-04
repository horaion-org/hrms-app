import type { ParseKeys } from "i18next";
import type { Heroicon } from "@/common/types";
import {
	ApproveRequestsIcon,
	CrossIcon,
	InfoIcon,
	PublishIcon,
	SchedulingIcon,
	SwapIcon,
	TickIcon,
} from "@/components/ui/Icon";

/** Warning asks the reader to act, success and error are outcomes, info is a fact, neutral is unrecognised. */
export type NotificationTone =
	"info" | "success" | "warning" | "error" | "neutral";

export type NotificationCategory = "leave" | "schedule" | "other";

/** How one notification type looks in the inbox. The wording lives in the locales under `notifications.types`. */
export type NotificationTypeDescriptor = {
	icon: Heroicon;
	tone: NotificationTone;
	category: NotificationCategory;
	title: ParseKeys;
};

/**
 * Every type the app can present. The schedule types arrive with schedule publish (backlog T2-6); listing them here
 * keeps that work to adding their targets. Adding a type means adding one entry and its `notifications.types` copy.
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

/**
 * The `/leave` search that opens a notification's leave request, or undefined when it does not point at one.
 * Reviewers also get the beneficiary, which the review dialog needs.
 */
export const leaveRequestTarget = (
	notification: {
		type: string;
		leaveRequestId: string | null;
		membershipId: string | null;
	},
	audience: "PERSONAL" | "REVIEW"
): { requestId: string; memberId: string | undefined } | undefined => {
	if (
		describeNotificationType(notification.type).category !== "leave" ||
		!notification.leaveRequestId
	)
		return undefined;
	return {
		requestId: notification.leaveRequestId,
		memberId:
			audience === "REVIEW"
				? (notification.membershipId ?? undefined)
				: undefined,
	};
};
