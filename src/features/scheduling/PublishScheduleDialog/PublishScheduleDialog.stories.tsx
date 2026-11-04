import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { PublishScheduleDialog } from "@/features/scheduling/PublishScheduleDialog";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/PublishScheduleDialog",
	component: PublishScheduleDialog,
	args: {
		companyId: "story-company",
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof PublishScheduleDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Publishing makes the roster final for its week, so the dialog says so. */
export const Default: Story = {};
