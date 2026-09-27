import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { PasswordInput } from "@/components/forms/PasswordInput";

const meta = {
	title: "Forms/PasswordInput",
	component: PasswordInput,
	args: {
		"aria-label": "Password",
		defaultValue: "correct horse",
		disabled: false,
		onChange: fn(),
	},
	argTypes: {
		status: { control: "select", options: [undefined, "success", "error"] },
		disabled: { control: "boolean" },
	},
} satisfies Meta<typeof PasswordInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { defaultValue: undefined } };

export const Error: Story = { args: { status: "error" } };

export const Disabled: Story = { args: { disabled: true } };
