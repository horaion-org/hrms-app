import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShiftDayBar } from "@/features/scheduling/shifts/ShiftDayBar";

const meta = {
	title: "Features/Scheduling/Shifts/ShiftDayBar",
	component: ShiftDayBar,
	parameters: { layout: "padded" },
	args: {
		axis: { startMinute: 300, endMinute: 1920 },
		shift: { startTime: "08:00", endTime: "20:00" },
	},
} satisfies Meta<typeof ShiftDayBar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A day shift on an axis from 05:00 to 08:00 the next day. */
export const Day: Story = {};

/** An overnight shift: one bar running past midnight. */
export const Overnight: Story = {
	args: { shift: { startTime: "20:00", endTime: "08:00" } },
};
