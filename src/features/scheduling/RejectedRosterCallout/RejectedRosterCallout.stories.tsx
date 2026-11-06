import type { Meta, StoryObj } from "@storybook/react-vite";
import { RejectedRosterCallout } from "@/features/scheduling/RejectedRosterCallout";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RejectedRosterCallout",
	component: RejectedRosterCallout,
	parameters: { layout: "padded" },
	args: { schedule: generatedScheduleFixture({ status: "REJECTED" }) },
} satisfies Meta<typeof RejectedRosterCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Rejected with a reason, and the next step for someone who may regenerate it. */
export const WithNextStep: Story = { args: { showsNextStep: true } };

/** The same for someone who can't generate it again: no next step. */
export const ReadOnly: Story = {};
