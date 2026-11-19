import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChangeTimeline } from "@/features/scheduling/roster/ChangeTimeline";
import { changeDaysFixture } from "@/features/scheduling/roster/changeTimelineFixtures";

const meta = {
	title: "Features/Scheduling/ChangeTimeline",
	component: ChangeTimeline,
	args: { days: changeDaysFixture() },
} satisfies Meta<typeof ChangeTimeline>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Two days of hand changes, newest first. */
export const TwoDays: Story = {};
