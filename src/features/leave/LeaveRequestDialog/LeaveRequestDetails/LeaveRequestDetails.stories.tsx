import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveRequestDetails } from "./LeaveRequestDetails";

const meta = {
	title: "Features/Leave/LeaveRequestDialog/LeaveRequestDetails",
	component: LeaveRequestDetails,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<div className="max-w-150 p-6">
					<Story />
				</div>
			</I18nextProvider>
		),
	],
	args: { request: LEAVE_FIXTURES[1]! },
} satisfies Meta<typeof LeaveRequestDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A pending request with the applicant's remarks. */
export const Pending: Story = {};

export const Rejected: Story = { args: { request: LEAVE_FIXTURES[2]! } };

export const Approved: Story = { args: { request: LEAVE_FIXTURES[3]! } };
