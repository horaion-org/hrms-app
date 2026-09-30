import type { Meta, StoryObj } from "@storybook/react-vite";
import { AuthMessage } from "@/features/auth/AuthMessage";

const meta = {
	title: "Features/Auth/AuthMessage",
	component: AuthMessage,
	args: {
		kind: "error",
		children: "Something went wrong. Please try again.",
	},
	argTypes: {
		kind: { control: "inline-radio", options: ["error", "status"] },
		children: { control: "text" },
	},
} satisfies Meta<typeof AuthMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Error: Story = {};

export const Status: Story = {
	args: { kind: "status", children: "Check your email to continue." },
};
