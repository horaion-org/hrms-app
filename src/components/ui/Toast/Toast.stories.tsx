import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Toast } from "@/components/ui/Toast";

const meta = {
	title: "UI/Toast",
	component: Toast,
	parameters: { layout: "fullscreen" },
	args: {
		children: "Constraint successfully deleted",
		// Long enough to review the toast without it disappearing.
		duration: 60 * 60 * 1000,
		onDismiss: fn(),
	},
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoDismiss: Story = {
	args: { duration: 4000 },
};
