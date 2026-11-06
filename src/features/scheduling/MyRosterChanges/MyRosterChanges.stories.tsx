import type { Meta, StoryObj } from "@storybook/react-vite";
import { MyRosterChanges } from "@/features/scheduling/MyRosterChanges";
import { editedAssignmentFixture } from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const changedDay = editedAssignmentFixture(scheduleAssignmentsFixture()[0]!);

const meta = {
	title: "Features/Scheduling/MyRosterChanges",
	component: MyRosterChanges,
	parameters: { layout: "padded" },
	args: {
		className: "max-w-xl",
		assignments: [
			{
				...changedDay,
				lastChange: changedDay.lastChange && {
					...changedDay.lastChange,
					appliedBy: null,
					remark: "Covering the airport desk on Monday.",
				},
			},
		],
	},
} satisfies Meta<typeof MyRosterChanges>;

export default meta;
type Story = StoryObj<typeof meta>;
export const WithRemark: Story = {};
export const WithoutRemark: Story = {
	args: {
		assignments: [
			{
				...changedDay,
				lastChange: changedDay.lastChange && {
					...changedDay.lastChange,
					appliedBy: null,
				},
			},
		],
	},
};
