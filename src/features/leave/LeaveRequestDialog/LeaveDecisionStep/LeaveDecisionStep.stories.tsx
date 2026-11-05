import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LeaveDecisionStep } from "./LeaveDecisionStep";

const meta = {
	title: "Features/Leave/LeaveRequestDialog/LeaveDecisionStep",
	component: LeaveDecisionStep,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="max-w-150">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: {
		id: "decision",
		decision: "reject",
		note: "",
		onNoteChange: fn(),
		onSubmit: fn(),
	},
} satisfies Meta<typeof LeaveDecisionStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rejecting asks for a reason, which is required. */
export const Reject: Story = {};

export const RejectMissingReason: Story = {
	args: { error: "Enter a reason" },
};

/** Approving takes an optional comment. */
export const Approve: Story = { args: { decision: "approve" } };
