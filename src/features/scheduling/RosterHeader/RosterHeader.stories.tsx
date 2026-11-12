import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button";
import { RosterHeader } from "@/features/scheduling/RosterHeader";
import { generatedScheduleFixture } from "@/features/scheduling/schedules/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Scheduling/RosterHeader",
	component: RosterHeader,
	parameters: { layout: "padded" },
	args: {
		schedule: generatedScheduleFixture({ status: "GENERATED" }),
		actions: <Button>Publish roster</Button>,
	},
} satisfies Meta<typeof RosterHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Generated: Story = {};

/** A generated week after an earlier one still to review: the same word as the month page, "Tentative". */
export const Tentative: Story = {
	args: {
		schedule: {
			...generatedScheduleFixture({ status: "GENERATED" }),
			publication: {
				requiresApproval: false,
				stepLabels: [],
				submission: null,
				rejectedAtStep: null,
				waitingForWeek: { periodStart: "2026-10-05", periodEnd: "2026-10-11" },
			},
		},
	},
};

/** Being generated: no primary action yet. */
export const Generating: Story = {
	args: { schedule: generatedScheduleFixture(), actions: undefined },
};

/** The approval line the roster page passes as `meta`, with "Approval ›". */
const approvalLine = (line: string, mine = false): ReactNode => (
	<span className="flex flex-wrap items-center gap-x-2 font-normal">
		<span className={mine ? "font-medium" : undefined}>{line}</span>
		<Button variant="textlink">Approval ›</Button>
	</span>
);

/** A flow applies and nothing is submitted: Publish reads "Submit for approval". */
export const SubmitForApproval: Story = {
	args: {
		actions: <Button>Submit for approval</Button>,
		meta: (
			<span className="font-normal">Needs approval: Endorse → Publish</span>
		),
	},
};

/** The viewer approves a middle step. */
export const ApproveMiddleStep: Story = {
	args: {
		actions: <Button>Approve</Button>,
		meta: approvalLine("Waiting on you · step 1 of 2 (Endorse)", true),
	},
};

/** The viewer's approval publishes. */
export const ApproveAndPublish: Story = {
	args: {
		actions: <Button>Approve and publish</Button>,
		meta: approvalLine("Waiting on you · step 2 of 2 (Publish)", true),
	},
};

/** The submitter, or anyone else, while it waits: no decision button. */
export const WaitingForApproval: Story = {
	args: {
		actions: undefined,
		meta: approvalLine("Waiting for approval · step 1 of 2 (Endorse)"),
	},
};
