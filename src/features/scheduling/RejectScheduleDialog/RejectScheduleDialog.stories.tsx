import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyProviders } from "@/features/organisation/storyApi";
import { RejectScheduleDialog } from "@/features/scheduling/RejectScheduleDialog";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/Scheduling/RejectScheduleDialog",
	component: RejectScheduleDialog,
	args: {
		companyId: "story-company",
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof RejectScheduleDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The reason is required; confirming without one says so on the field. */
export const Default: Story = {};
