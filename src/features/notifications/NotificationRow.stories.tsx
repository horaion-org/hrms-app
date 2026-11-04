import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NotificationRow } from "@/features/notifications/NotificationRow";
import "@/common/i18n";

const now = new Date("2026-11-04T12:00:00Z");
const notification = {
	notificationId: "notification-1",
	type: "LEAVE_REQUEST_APPROVED",
	leaveRequestId: "leave-1",
	membershipId: "member-1",
	occurredAt: "2026-11-04T11:55:00Z",
	createdAt: "2026-11-04T11:55:05Z",
	readAt: null,
};
const meta = {
	title: "Features/Notifications/NotificationRow",
	component: NotificationRow,
	parameters: { layout: "padded" },
	args: {
		notification,
		now,
		children: "Your leave request was approved.",
		onRead: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof NotificationRow>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Unread: Story = {};
export const Read: Story = {
	args: { notification: { ...notification, readAt: notification.createdAt } },
};
export const Compact: Story = { args: { compact: true } };
export const Saving: Story = { args: { busy: true } };
export const NeedsReview: Story = {
	args: {
		notification: { ...notification, type: "LEAVE_REQUEST_SUBMITTED" },
		children: "A leave request needs review.",
	},
};
export const Rejected: Story = {
	args: {
		notification: {
			...notification,
			type: "LEAVE_REQUEST_REJECTED",
			occurredAt: "2026-10-20T08:00:00Z",
		},
		children: "Your leave request was rejected.",
	},
};
export const ShiftAssigned: Story = {
	args: {
		notification: { ...notification, type: "SHIFT_ASSIGNMENT" },
		children: "You have new shifts on a published schedule.",
	},
};
export const UnknownType: Story = {
	args: {
		notification: { ...notification, type: "SOMETHING_NEW" },
		children: "You have a new notification.",
	},
};
