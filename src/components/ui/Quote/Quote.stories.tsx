import type { Meta, StoryObj } from "@storybook/react-vite";
import { Quote } from "@/components/ui/Quote";

const meta = {
	title: "UI/Quote",
	component: Quote,
	parameters: { layout: "padded" },
	args: {
		caption: "Reason for rejection",
		children: "Too many night shifts for the kitchen team.",
		className: "max-w-md",
	},
} satisfies Meta<typeof Quote>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Line breaks in the quoted text are kept. */
export const SeveralLines: Story = {
	args: {
		caption: "What the engine said",
		children:
			"No roster satisfies the staffing rules.\nFront desk needs 3 people on Monday; 2 are available.",
	},
};
