import type { Meta, StoryObj } from "@storybook/react-vite";
import { rosterChangeDepartmentFixture } from "@/features/reports/fixtures";
import { RosterStabilityTable } from "@/features/reports/RosterStabilityTable";
import "@/common/i18n";

const meta = {
	title: "Features/Reports/RosterStabilityTable",
	component: RosterStabilityTable,
	args: { departments: [rosterChangeDepartmentFixture()] },
} satisfies Meta<typeof RosterStabilityTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoPublishedRosters: Story = { args: { departments: [] } };
