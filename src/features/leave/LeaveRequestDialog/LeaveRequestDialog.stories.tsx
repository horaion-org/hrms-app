import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { rosteredDaysQuery } from "@/features/leave/api";
import { LEAVE_FIXTURES, LEAVE_TYPE_FIXTURES } from "@/features/leave/fixtures";
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

const reviewed = LEAVE_FIXTURES[1]!;
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	rosteredDaysQuery(
		"c-1",
		{ start: reviewed.startDate, end: reviewed.endDate },
		reviewed.membershipId
	).queryKey,
	[{ day: reviewed.startDate, minutes: 480 }]
);

const meta = {
	title: "Features/Leave/LeaveRequestDialog",
	component: LeaveRequestDialog,
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={client}>
				<I18nextProvider i18n={authTestI18n}>
					<Story />
				</I18nextProvider>
			</QueryClientProvider>
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
export const Approval: Story = { args: { mode: "approve" } };
/** The reviewer must tick the shifts before the approval can be confirmed. */
export const ApprovalOverAShift: Story = {
	args: {
		mode: "approve",
		lifecycle: { companyId: "c-1", own: false, onDone: (): void => {} },
	},
};
export const Rejected: Story = { args: { request: LEAVE_FIXTURES[2] } };
export const Approved: Story = { args: { request: LEAVE_FIXTURES[3] } };
export const Apply: Story = {
	args: { mode: "apply", leaveTypes: LEAVE_TYPE_FIXTURES },
};
export const ApplyRefused: Story = {
	args: {
		mode: "apply",
		leaveTypes: LEAVE_TYPE_FIXTURES,
		refusal: {
			fields: { endDate: "They already have leave on one of these days." },
			refreshMembers: false,
		},
	},
};
