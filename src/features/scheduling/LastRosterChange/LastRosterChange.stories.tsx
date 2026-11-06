import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { fn } from "storybook/test";
import { LastRosterChange } from "@/features/scheduling/LastRosterChange";
import { latestRosterChangeKey } from "@/features/scheduling/rosterChanges/api";
import { rosterChangeFixture } from "@/features/scheduling/rosterChanges/fixtures";
import "@/common/i18n";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	latestRosterChangeKey("c-1", "s-1", 2),
	rosterChangeFixture()
);

const meta = {
	title: "Features/Scheduling/LastRosterChange",
	component: LastRosterChange,
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={client}>
				<Story />
			</QueryClientProvider>
		),
	],
	args: {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 2,
		onAppliedDismissed: fn(),
	},
} satisfies Meta<typeof LastRosterChange>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The latest edit above the grid, with Undo. */
export const Default: Story = {};

/** Right after applying: the toast with Undo as well. */
export const JustApplied: Story = { args: { applied: rosterChangeFixture() } };
