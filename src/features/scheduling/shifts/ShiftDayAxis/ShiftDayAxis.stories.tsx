import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShiftDayAxis } from "@/features/scheduling/shifts/ShiftDayAxis";

const meta = {
	title: "Features/Scheduling/Shifts/ShiftDayAxis",
	component: ShiftDayAxis,
	parameters: { layout: "padded" },
	args: { axis: { startMinute: 300, endMinute: 1920 }, label: "When it runs" },
} satisfies Meta<typeof ShiftDayAxis>;

export default meta;

type Story = StoryObj<typeof meta>;

/** From 05:00 to 08:00 the next day, every three hours. */
export const OvernightDay: Story = {};
