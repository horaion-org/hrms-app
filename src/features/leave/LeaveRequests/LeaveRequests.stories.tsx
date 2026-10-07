import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { LEAVE_FIXTURES } from "@/features/leave/fixtures";
import { LeaveRequests } from "@/features/leave/LeaveRequests";

const meta = {
	title: "Features/Leave/LeaveRequests",
	component: LeaveRequests,
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	args: {
		rows: LEAVE_FIXTURES,
		total: LEAVE_FIXTURES.length,
		page: 1,
		sort: { field: "requestedAt", desc: true },
		canReview: (): boolean => true,
		onPageChange: (): void => {},
		onSortChange: (): void => {},
		onStatusChange: (): void => {},
		onOpen: (): void => {},
		onApprove: (): void => {},
	},
} satisfies Meta<typeof LeaveRequests>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ReadOnly: Story = { args: { canReview: (): boolean => false } };
export const Empty: Story = { args: { rows: [], total: 0 } };
