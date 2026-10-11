import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RosterGrid } from "@/features/scheduling/RosterGrid";
import {
	daysOf,
	exampleSchedules,
	exampleScheduleDetail,
} from "@/features/scheduling/schedules";
import "@/common/i18n";

const today = new Date();
const [first] = exampleSchedules(today).current;
const detail = exampleScheduleDetail(first!.scheduleId, today)!;

const meta = {
	title: "Features/Scheduling/RosterGrid",
	component: RosterGrid,
	parameters: { layout: "padded" },
	args: {
		groups: detail.groups,
		days: daysOf(detail.period.start),
		onShiftSelect: fn(),
	},
} satisfies Meta<typeof RosterGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShiftSelected: Story = {
	args: {
		selectedShiftId: detail.groups[0]?.staff[0]?.shifts[0]?.shiftId,
	},
};
