import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { RegenerateDialog } from "@/features/scheduling/RegenerateDialog";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/RegenerateDialog",
	component: RegenerateDialog,
	args: {
		companyId: "story-company",
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof RegenerateDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A generated roster is replaced, so it asks in red. */
export const Generated: Story = {};

/** After a failed generation there is nothing to replace. */
export const AfterAFailure: Story = {
	args: { schedule: generatedScheduleFixture({ status: "GENERATION_FAILED" }) },
};
