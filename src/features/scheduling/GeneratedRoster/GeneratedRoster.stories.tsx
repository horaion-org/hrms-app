import type { Meta, StoryObj } from "@storybook/react-vite";
import { GeneratedRoster } from "@/features/scheduling/GeneratedRoster";
import {
	generatedScheduleFixture,
	scheduleAssignmentsFixture,
} from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/GeneratedRoster",
	component: GeneratedRoster,
	parameters: { layout: "padded" },
	args: {
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		assignments: scheduleAssignmentsFixture(),
	},
} satisfies Meta<typeof GeneratedRoster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
