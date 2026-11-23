import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	officerWeek,
	partTimerWeek,
	rosterHours,
} from "@/features/scheduling/hours/fixtures";
import { RosterHours } from "@/features/scheduling/hours/RosterHours";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterHours",
	component: RosterHours,
	parameters: { layout: "padded" },
	args: {
		assignments: scheduleAssignmentsFixture(),
		hours: {
			status: "ready",
			hours: rosterHours([officerWeek(), partTimerWeek()]),
		},
	},
} satisfies Meta<typeof RosterHours>;

export default meta;

type Story = StoryObj<typeof meta>;

/** An officer with 28 h of overtime and a part-timer with 10 h extra, then the total. */
export const Default: Story = {};

/** A week that counts the officer's approved leave day: a Leave column, and the note says what it is. */
export const WithCountedLeave: Story = {
	args: {
		hours: {
			status: "ready",
			hours: rosterHours([
				officerWeek("mp-1", { countedLeaveMinutes: 480 }),
				partTimerWeek(),
			]),
		},
	},
};

/** A roster with nobody on it. */
export const NobodyRostered: Story = {
	args: { hours: { status: "ready", hours: rosterHours([]) } },
};

/** While the hours load. */
export const Loading: Story = { args: { hours: { status: "pending" } } };

/** When the hours couldn't load. */
export const LoadFailed: Story = { args: { hours: { status: "error" } } };
