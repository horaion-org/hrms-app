import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { Overview } from "@/features/reports/Overview";
import { overviewFixture } from "@/features/reports/overviewFixture";
import "@/common/i18n";

const meta = {
	title: "Features/Reports/Overview",
	component: Overview,
	decorators: [withMemoryRouter],
	args: {
		grouping: "branch",
		overview: { status: "ready", data: overviewFixture() },
		shown: (): boolean => true,
	},
} satisfies Meta<typeof Overview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Loading: Story = { args: { overview: { status: "pending" } } };
export const Failed: Story = { args: { overview: { status: "error" } } };
