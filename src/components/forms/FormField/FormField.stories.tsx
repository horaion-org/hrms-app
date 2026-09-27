import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";

const meta = {
	title: "Forms/FormField",
	component: FormField,
	args: {
		label: "Email",
		children: (control): ReactNode => (
			<Input {...control} placeholder="e.g. jose@horaion.com" type="email" />
		),
	},
	argTypes: {
		children: { control: false },
		hint: { control: "text" },
		error: { control: "text" },
	},
} satisfies Meta<typeof FormField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
	args: { hint: "We send your confirmation code here." },
};

export const WithError: Story = {
	args: {
		hint: "We send your confirmation code here.",
		error: "Enter a valid email address",
	},
};
