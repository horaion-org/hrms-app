import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { leaveHistoryQuery } from "@/features/leave/api";
import { leaveFixture } from "@/features/leave/fixtures";
import { LeaveRequestLifecycle } from "./LeaveRequestLifecycle";

const approved = leaveFixture({
	leaveRequestId: "leave-1",
	status: "APPROVED",
	startDate: "2026-06-01",
	endDate: "2026-06-05",
});
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});
client.setQueryData(
	leaveHistoryQuery("c-1", "leave-1", approved.membershipId).queryKey,
	[
		{
			kind: "CHANGED",
			affectedDay: null,
			beforeLeaveTypeName: "Annual leave",
			afterLeaveTypeName: "Annual leave",
			beforeStartDate: "2026-06-01",
			beforeEndDate: "2026-06-03",
			afterStartDate: "2026-06-01",
			afterEndDate: "2026-06-05",
			remark: "Extended after the call.",
			changedByMembershipId: "m-sam",
			changedByName: "Sam Tan",
			changedAt: "2026-05-20T08:00:00Z",
		},
	]
);
client.setQueryData(leaveHistoryQuery("c-1", "leave-1").queryKey, []);

const meta = {
	title: "Features/Leave/LeaveRequestDialog/LeaveRequestLifecycle",
	component: LeaveRequestLifecycle,
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={client}>
				<I18nextProvider i18n={authTestI18n}>
					<div className="max-w-150 p-6">
						<Story />
					</div>
				</I18nextProvider>
			</QueryClientProvider>
		),
	],
	args: {
		companyId: "c-1",
		request: approved,
		own: false,
		canChange: true,
		onDone: fn(),
	},
} satisfies Meta<typeof LeaveRequestLifecycle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A reviewer on approved leave: the history, with Change and Cancel. */
export const Reviewer: Story = {};

/** A reader who may not change it sees the history only. */
export const ReadOnly: Story = { args: { canChange: false } };

/** The member's own pending request can be withdrawn. */
export const OwnPending: Story = {
	args: {
		own: true,
		canChange: false,
		request: leaveFixture({ leaveRequestId: "leave-1" }),
	},
};
