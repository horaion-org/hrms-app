import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";

const employees = {
	search: "",
	onSearch: (): void => {},
	options: LEAVE_FIXTURES.map(
		({ membershipId, displayName, employeeCode }) => ({
			membershipId,
			displayName,
			employeeCode,
		})
	),
};

const meta = {
	title: "Features/Leave/LeaveRequestDialog",
	component: LeaveRequestDialog,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		request: LEAVE_FIXTURES[1],
		canReview: true,
		employees,
		onClose: (): void => {},
		onApprove: (): void => {},
		onReject: (): void => {},
		onCreate: (): void => {},
	},
} satisfies Meta<typeof LeaveRequestDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {};
export const ReadOnly: Story = { args: { canReview: false } };
export const Rejection: Story = { args: { mode: "reject" } };
export const Rejected: Story = { args: { request: LEAVE_FIXTURES[2] } };
export const Approved: Story = { args: { request: LEAVE_FIXTURES[3] } };
export const Apply: Story = { args: { mode: "apply" } };
export const ApplyRefused: Story = {
	args: {
		mode: "apply",
		refusal: {
			fields: { endDate: "They already have leave on one of these days." },
			refreshMembers: false,
		},
	},
};
