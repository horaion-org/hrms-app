import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { staffingRuleFixture } from "@/features/dashboard/fixtures";
import { StaffingTable } from "@/features/reports/StaffingTable";
import "@/common/i18n";

const meta = {
	title: "Features/Reports/StaffingTable",
	component: StaffingTable,
	decorators: [withMemoryRouter],
	args: {
		rules: [
			staffingRuleFixture(),
			staffingRuleFixture({
				ruleName: "Closing",
				headcount: 1,
				peopleWithTitles: 4,
				holderDaysAWeek: 20,
				neededShiftDaysAWeek: 7,
				gapsInRange: 2,
			}),
		],
	},
} satisfies Meta<typeof StaffingTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoRules: Story = { args: { rules: [] } };
