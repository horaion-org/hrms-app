import type { InboxNotification } from "@/features/notifications/api";

/** Fictional, in-memory examples for development previews; these identifiers are never sent to the API. */
export const notificationDemoFixtures = (): Array<InboxNotification> => {
	const now = Date.now();
	const types: Array<InboxNotification["type"]> = [
		"LEAVE_REQUEST_APPROVED",
		"LEAVE_REQUEST_REJECTED",
		"LEAVE_REQUEST_SUBMITTED",
	];
	return Array.from({ length: 60 }, (_, index) => {
		const occurredAt = new Date(
			now - (index * index * 60 + 5) * 60_000
		).toISOString();
		return {
			notificationId: `demo-notification-${index}`,
			type: types[index % types.length]!,
			leaveRequestId: `demo-leave-${index}`,
			membershipId: "demo-member",
			occurredAt,
			createdAt: occurredAt,
			readAt: index >= 42 ? occurredAt : null,
		};
	});
};
