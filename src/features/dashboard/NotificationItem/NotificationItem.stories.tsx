import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CrossIcon, TickIcon } from "@/components/ui/Icon";
import { NotificationItem } from "@/features/dashboard/NotificationItem";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/NotificationItem",
	component: NotificationItem,
	parameters: { layout: "padded" },
	args: {
		title: "Annual leave request",
		detail: "from John Lim (12–14 May)",
		primaryAction: {
			label: "Approve",
			icon: <TickIcon className="text-success-600" />,
			onClick: fn(),
		},
		secondaryAction: {
			label: "Deny with reason",
			icon: <CrossIcon className="text-error-600" />,
			onClick: fn(),
		},
		onOpen: fn(),
		className: "max-w-96",
	},
} satisfies Meta<typeof NotificationItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LeaveRequest: Story = {};

export const Example: Story = {
	args: {
		title: "Staff shortage detected",
		detail: "for Saturday (Dinner Shift), 2 roles unfilled",
		tag: "Example",
		primaryAction: { label: "Fill shift", disabled: true },
		secondaryAction: { label: "Dismiss", disabled: true },
		onOpen: undefined,
	},
};
