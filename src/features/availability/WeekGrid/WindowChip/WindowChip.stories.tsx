import type { Meta, StoryObj } from "@storybook/react-vite";
import { WindowChip } from "@/features/availability/WeekGrid/WindowChip";

const meta = {
	title: "Features/Availability/WeekGrid/WindowChip",
	component: WindowChip,
	parameters: { layout: "centered" },
	args: { window: { startTime: "09:00", endTime: "13:00" } },
} satisfies Meta<typeof WindowChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Daytime: Story = {};

export const PastMidnight: Story = {
	args: { window: { startTime: "22:00", endTime: "06:00" } },
};
