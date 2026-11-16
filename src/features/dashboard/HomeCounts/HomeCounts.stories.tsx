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
		states: {
			"short-shifts": "content",
			"leave-to-decide": "content",
			"waiting-approvals": "empty",
			"next-roster": "content",
			"cover-offers": "content",
			"off-today": "content",
			"people-events": "empty",
		},
	},
} satisfies Meta<typeof HomeCounts>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Nothing needs the person: every tile stays in its place at zero. */
export const AllAtZero: Story = {
	args: {
		counts: {},
		states: {
			"short-shifts": "empty",
			"leave-to-decide": "empty",
			"waiting-approvals": "empty",
			"next-roster": "empty",
			"cover-offers": "empty",
			"off-today": "empty",
			"people-events": "empty",
		},
	},
};

/** Someone whose grants reach only leave. */
export const OneSection: Story = {
	args: {
		counts: { "leave-to-decide": 1 },
		states: {
			"short-shifts": "hidden",
			"leave-to-decide": "content",
			"waiting-approvals": "hidden",
			"next-roster": "hidden",
			"cover-offers": "hidden",
			"off-today": "hidden",
			"people-events": "hidden",
		},
	},
};
