import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { HomeCounts } from "@/features/dashboard/HomeCounts";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/HomeCounts",
	component: HomeCounts,
	decorators: [withMemoryRouter],
	args: {
		counts: {
			"short-shifts": 18,
			"leave-to-decide": 3,
			"next-roster": 1,
			"cover-offers": 2,
			"off-today": 4,
		},
	},
} satisfies Meta<typeof HomeCounts>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const OneThing: Story = { args: { counts: { "leave-to-decide": 1 } } };
