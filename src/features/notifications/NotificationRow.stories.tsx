import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NotificationRow } from "@/features/notifications/NotificationRow";
import "@/common/i18n";

const notification = {
	notificationId: "notification-1",
	type: "LEAVE_REQUEST_APPROVED" as const,
	leaveRequestId: "leave-1",
	membershipId: "member-1",
	occurredAt: "2026-10-18T08:00:00Z",
	createdAt: "2026-10-18T08:00:05Z",
	readAt: null,
};
const meta = {
	title: "Features/Notifications/NotificationRow",
	component: NotificationRow,
	parameters: { layout: "padded" },
	args: {
		notification,
		children: "Your leave request was approved.",
		onRead: fn(),
	},
} satisfies Meta<typeof NotificationRow>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Unread: Story = {};
export const Read: Story = {
	args: { notification: { ...notification, readAt: notification.createdAt } },
};
export const Saving: Story = { args: { busy: true } };
