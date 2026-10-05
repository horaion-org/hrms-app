import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const meta = {
	title: "UI/ConfirmDialog",
	component: ConfirmDialog,
	args: {
		title: "Deactivate branch",
		description:
			"Orchard stays in your lists as inactive and can be activated again.",
		confirmLabel: "Deactivate branch",
		cancelLabel: "Cancel",
		onConfirm: fn(),
		onClose: fn(),
	},
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Submitting: Story = { args: { submitting: true } };

export const Failed: Story = {
	args: { error: "We couldn’t deactivate the branch. Try again." },
};
