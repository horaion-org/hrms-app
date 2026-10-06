import type { Meta, StoryObj } from "@storybook/react-vite";
import { GenerateStep } from "@/features/scheduling/GenerateStep";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/GenerateStep",
	component: GenerateStep,
	parameters: { layout: "padded" },
	args: { summary: { shifts: 4, roles: 18, coverage: 96, conflicts: 0 } },
} satisfies Meta<typeof GenerateStep>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PartialCoverage: Story = {
	args: { summary: { shifts: 2, roles: 9, coverage: 67, conflicts: 0 } },
};
