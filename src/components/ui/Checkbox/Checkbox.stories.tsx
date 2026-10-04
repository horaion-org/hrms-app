import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "@/components/ui/Checkbox";

const meta = {
	title: "UI/Checkbox",
	component: Checkbox,
	args: {
		label: "Remember me",
	},
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
	args: { checked: true, readOnly: true },
};

export const Disabled: Story = {
	args: { disabled: true },
};

export const Indeterminate: Story = {
	args: { label: "Select all", indeterminate: true, readOnly: true },
};

export const HiddenLabel: Story = {
	args: { label: "Select Orchard", hideLabel: true },
};
