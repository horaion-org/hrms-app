import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { DeleteScheduleDialog } from "@/features/scheduling/DeleteScheduleDialog";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/DeleteScheduleDialog",
	component: DeleteScheduleDialog,
	args: {
		companyId: "story-company",
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		onClose: fn(),
		onDeleted: fn(),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof DeleteScheduleDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Names the department and week, and asks in red. */
export const Generated: Story = {};

/** While a run is open the schedule can't be deleted yet, so confirming is held back. */
export const BeingGenerated: Story = {
	args: {
		schedule: generatedScheduleFixture({ status: "GENERATION_REQUESTED" }),
	},
};
