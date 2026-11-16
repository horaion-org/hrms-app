import type { Meta, StoryObj } from "@storybook/react-vite";
import { overtimeFixture } from "@/features/dashboard/fixtures";
import { OvertimeTable } from "@/features/insights/OvertimeTable";
import "@/common/i18n";

const meta = {
	title: "Features/Insights/OvertimeTable",
	component: OvertimeTable,
	args: {
		departments: overtimeFixture().departments,
		nearSharePercent: 80,
	},
} satisfies Meta<typeof OvertimeTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoOvertime: Story = { args: { departments: [] } };
