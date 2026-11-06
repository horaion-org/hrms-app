import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button";
import { RosterHeader } from "@/features/scheduling/RosterHeader";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterHeader",
	component: RosterHeader,
	parameters: { layout: "padded" },
	args: {
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		actions: <Button>Publish roster</Button>,
	},
} satisfies Meta<typeof RosterHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Generated: Story = {};

/** Being generated: no primary action yet. */
export const Generating: Story = {
	args: { schedule: generatedScheduleFixture(), actions: undefined },
};
