import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { ApprovalTrail } from "@/features/approvals/ApprovalTrail";
import {
	AHMAD,
	approvalInstanceFixture,
	atStepTwoFixture,
	endorseStep,
	publishStep,
	rejectedAtEndorseFixture,
	SITI,
	sitiApproved,
} from "@/features/approvals/fixtures";
import "@/common/i18n";

const moment = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "Asia/Singapore",
});

const meta = {
	title: "Features/Approvals/ApprovalTrail",
	component: ApprovalTrail,
	parameters: { layout: "padded" },
	decorators: [
		(Story): ReactElement => (
			<div className="w-full max-w-96 rounded-lg border border-neutral-400 p-4">
				<Story />
			</div>
		),
	],
	args: {
		departmentName: "Front Office",
		formatMoment: (instant: string): string => moment.format(new Date(instant)),
		instance: approvalInstanceFixture({ eligibleCount: 3 }),
	},
} satisfies Meta<typeof ApprovalTrail>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Step 1 of 2 open, decided by anyone who can publish. */
export const Waiting: Story = {};

/** Step 1 approved with a comment; step 2 is the viewer's to decide. */
export const ApprovedThenYourTurn: Story = {
	args: { instance: atStepTwoFixture({ canDecide: true }) },
};

/** Rejected at step 1, with the reason; step 2 was never reached. */
export const Rejected: Story = {
	args: { instance: rejectedAtEndorseFixture() },
};

/** "All of them": each named person carries their own mark. */
export const AllOfThem: Story = {
	args: {
		instance: approvalInstanceFixture({
			steps: [
				endorseStep({
					rule: "MEMBERS",
					quorum: "ALL",
					members: [AHMAD, SITI],
					decisions: [sitiApproved],
				}),
				publishStep(),
			],
		}),
	},
};
