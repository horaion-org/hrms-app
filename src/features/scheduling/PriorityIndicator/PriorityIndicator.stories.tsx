import type { Meta, StoryObj } from "@storybook/react-vite";
import { PriorityIndicator } from "@/features/scheduling/PriorityIndicator";
import { PRIORITIES } from "@/features/scheduling/scheduleDraft";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/PriorityIndicator",
	component: PriorityIndicator,
	args: { priority: "HIGH" },
	argTypes: {
		priority: { control: "select", options: PRIORITIES },
	},
} satisfies Meta<typeof PriorityIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const High: Story = {};

export const Medium: Story = { args: { priority: "MEDIUM" } };

export const Low: Story = { args: { priority: "LOW" } };
