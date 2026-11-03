import type { Meta, StoryObj } from "@storybook/react-vite";
import { Callout } from "@/components/ui/Callout";

const meta = {
	title: "UI/Callout",
	component: Callout,
	parameters: { layout: "padded" },
	args: {
		children: "Select a period that aligns with your business operations.",
	},
} satisfies Meta<typeof Callout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongText: Story = {
	args: {
		className: "max-w-sm",
		children:
			"Generation may take a few moments. The more constraints and data, the longer it may take.",
	},
};

export const Warning: Story = {
	args: {
		tone: "warning",
		children:
			"2 part-time members have no availability and will be left off the roster.",
	},
};
