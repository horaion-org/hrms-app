import type { Meta, StoryObj } from "@storybook/react-vite";
import { DayCoverMarks } from "@/features/scheduling/months/DayCoverMarks";
import { coverDays } from "@/features/scheduling/months/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/Months/DayCoverMarks",
	component: DayCoverMarks,
	parameters: { layout: "padded" },
	args: { days: coverDays("2026-11-16") },
} satisfies Meta<typeof DayCoverMarks>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EveryShiftCovered: Story = {};
export const OneShortDay: Story = {
	args: { days: coverDays("2026-11-16", { 4: 1 }) },
};
export const ThreeShortDays: Story = {
	args: { days: coverDays("2026-11-16", { 0: 1, 2: 2, 5: 1 }) },
};
export const NoRoster: Story = { args: { days: [] } };
