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

/** Where a flow applies, Publish submits the roster to its steps. */
export const SubmitForApproval: Story = {
	args: { mode: { kind: "submit", stepLabels: ["Endorse", "Publish"] } },
};

/** A middle step: the approver's comment is optional, and the next step is named. */
export const ApproveMiddleStep: Story = {
	args: {
		mode: {
			kind: "approve",
			instanceId: "ai-1",
			step: { order: 1, count: 2, label: "Endorse", isLast: false },
			nextLabel: "Publish",
		},
	},
};

/** The last step: approving publishes the roster. */
export const ApproveAndPublish: Story = {
	args: {
		mode: {
			kind: "approve",
			instanceId: "ai-1",
			step: { order: 2, count: 2, label: "Publish", isLast: true },
		},
	},
};
