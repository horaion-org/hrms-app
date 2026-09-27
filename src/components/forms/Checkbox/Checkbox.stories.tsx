import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Checkbox } from "@/components/forms/Checkbox";

const meta = {
	title: "Forms/Checkbox",
	component: Checkbox,
	args: {
		label: "Remember me",
		disabled: false,
		onChange: fn(),
	},
	argTypes: {
		disabled: { control: "boolean" },
		defaultChecked: { control: "boolean" },
	},
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };
