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

export const WithAction: Story = {
	args: {
		children: "Roster changed.",
		action: { label: "Undo", onClick: fn() },
	},
};

/** A long message wraps to as many lines as it needs, Undo kept beside it. */
export const LongMessage: Story = {
	args: {
		children:
			"Roster changed. Swing Shift is still 1 short 14:00 – 15:00, 17:00 – 22:00.",
		action: { label: "Undo", onClick: fn() },
	},
};
