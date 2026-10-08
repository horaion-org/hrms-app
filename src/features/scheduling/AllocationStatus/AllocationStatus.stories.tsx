import type { Meta, StoryObj } from "@storybook/react-vite";
import { AllocationStatus } from "@/features/scheduling/AllocationStatus";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/AllocationStatus",
	component: AllocationStatus,
	args: { allocated: 4, needed: 4 },
} satisfies Meta<typeof AllocationStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Complete: Story = {};

export const Short: Story = { args: { allocated: 2, needed: 3 } };

export const Over: Story = { args: { allocated: 7, needed: 6 } };
