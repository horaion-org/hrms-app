import type { Meta, StoryObj } from "@storybook/react-vite";
import { staffingRuleFixture } from "@/features/reports/fixtures";
import { StaffingTable } from "@/features/reports/StaffingTable";
import "@/common/i18n";

const meta = {
	title: "Features/Reports/StaffingTable",
	component: StaffingTable,
	args: {
		rules: [
			staffingRuleFixture(),
			staffingRuleFixture({
				ruleName: "Closing",
				headcount: 1,
				peopleWithTitles: 4,
				gapsInRange: 0,
			}),
		],
	},
} satisfies Meta<typeof StaffingTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoRules: Story = { args: { rules: [] } };
