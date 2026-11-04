import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FileDrop } from "@/components/forms/FileDrop";

const meta = {
	title: "Forms/FileDrop",
	component: FileDrop,
	parameters: { layout: "padded" },
	args: {
		prompt: "Drop your file here, or",
		chooseLabel: "choose a file",
		hint: ".xlsx or .csv · up to 500 people · 2 MB",
		accept: [".xlsx", ".csv"],
		onFileChange: fn(),
	},
} satisfies Meta<typeof FileDrop>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };
