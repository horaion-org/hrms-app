import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { CloseToLimitCard } from "@/features/dashboard/CloseToLimitCard";
import { overtimeFixture } from "@/features/dashboard/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/CloseToLimitCard",
	component: CloseToLimitCard,
	decorators: [withMemoryRouter],
	args: {
		className: "max-w-md",
		overtime: { status: "ready", data: overtimeFixture() },
	},
} satisfies Meta<typeof CloseToLimitCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NobodyClose: Story = {
	args: {
		overtime: { status: "ready", data: overtimeFixture({ departments: [] }) },
	},
};
