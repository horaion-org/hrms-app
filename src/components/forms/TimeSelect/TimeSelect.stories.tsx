import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TimeSelect } from "@/components/forms/TimeSelect";
import "@/common/i18n";

const meta = {
	title: "Forms/TimeSelect",
	component: TimeSelect,
	args: {
		"aria-label": "Start time",
		className: "w-40",
		placeholder: "Please select",
		onChange: fn(),
	},
} satisfies Meta<typeof TimeSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Chosen: Story = { args: { value: "09:30" } };
