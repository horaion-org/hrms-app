import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ScheduleDecisionPanel } from "@/features/scheduling/ScheduleDecisionPanel";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/ScheduleDecisionPanel",
	component: ScheduleDecisionPanel,
	parameters: { layout: "padded" },
	args: {
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		onPublish: fn(),
		onReject: fn(),
	},
} satisfies Meta<typeof ScheduleDecisionPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A generated roster, for someone who may publish or reject it. */
export const AwaitingDecision: Story = {};

/** The same roster for someone without schedule:publish: no buttons. */
export const AwaitingDecisionReadOnly: Story = {
	args: { onPublish: undefined, onReject: undefined },
};

export const Published: Story = {
	args: { schedule: generatedScheduleFixture({ status: "PUBLISHED" }) },
};

/** Rejected with a reason, and the next step for someone who may regenerate it. */
export const Rejected: Story = {
	args: {
		schedule: generatedScheduleFixture({ status: "REJECTED" }),
		showsNextStep: true,
	},
};
