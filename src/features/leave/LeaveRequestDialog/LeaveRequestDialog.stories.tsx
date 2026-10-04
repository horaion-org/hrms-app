import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { sampleRequests } from "@/features/leave/sampleData";
import { LeaveRequestDialog } from "@/features/leave/LeaveRequestDialog";
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
		request: sampleRequests[6],
		employees: sampleRequests,
		onClose: (): void => {},
		onApprove: (): void => {},
		onReject: (): void => {},
		onCreate: (): void => {},
	},
} satisfies Meta<typeof LeaveRequestDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pending: Story = {};
export const Rejection: Story = { args: { mode: "reject" } };
export const Approved: Story = { args: { request: sampleRequests[0] } };
export const Apply: Story = { args: { mode: "apply" } };
