import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorText } from "@/components/ui/ErrorText";

const meta = {
	title: "UI/ErrorText",
	component: ErrorText,
	parameters: { layout: "padded" },
	args: {
		children: "Someone changed this roster since you opened it. Reload it.",
	},
} satisfies Meta<typeof ErrorText>;

export default meta;

type Story = StoryObj<typeof meta>;

/** An action that didn't go through, said where it was tried. */
export const Default: Story = {};

export const WithSpacing: Story = {
	args: {
		className: "mt-6 max-w-sm",
		children:
			"This schedule couldn't be saved. Check your connection and try again.",
	},
};
