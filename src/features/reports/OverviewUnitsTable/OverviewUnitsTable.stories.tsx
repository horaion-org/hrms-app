import type { Meta, StoryObj } from "@storybook/react-vite";
import { overviewFixture } from "@/features/reports/overviewFixture";
import { OverviewUnitsTable } from "@/features/reports/OverviewUnitsTable";
import "@/common/i18n";

const meta = {
	title: "Features/Reports/OverviewUnitsTable",
	component: OverviewUnitsTable,
	args: {
		grouping: "branch",
		rostersInReach: true,
		units: overviewFixture().units,
	},
} satisfies Meta<typeof OverviewUnitsTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Branches: Story = {};
