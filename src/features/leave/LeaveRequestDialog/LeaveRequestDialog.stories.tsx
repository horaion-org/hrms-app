import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { approvalInstanceQuery } from "@/features/approvals/api";
import { leaveAtHrInstanceFixture } from "@/features/approvals/fixtures";
import { rosteredDaysQuery } from "@/features/leave/api";
import {
	LEAVE_FIXTURES,
	LEAVE_TYPE_FIXTURES,
	leaveAtStepFixture,
} from "@/features/leave/fixtures";
import {
	LeaveRequestDialog,
	type LeaveApplyFormInput,
	type LeaveReview,
} from "@/features/leave/LeaveRequestDialog";

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
// Aisha's leave under Manager → HR: the steps for a reviewer who reads approvals, and HR's rostered day.
const atHr = leaveAtStepFixture(2);
client.setQueryData(
	approvalInstanceQuery("c-1", "ai-leave").queryKey,
	leaveAtHrInstanceFixture()
);
client.setQueryData(
	rosteredDaysQuery(
		"c-1",
		{ start: atHr.startDate, end: atHr.endDate },
		atHr.membershipId
	).queryKey,
	[{ day: atHr.startDate, minutes: 480 }]
);
const reviewerLifecycle = {
	companyId: "c-1",
	own: false,
	onDone: (): void => {},
};

/** An application on someone's behalf, with the company's leave types read. */
const applyForm: LeaveApplyFormInput = {
	busy: false,
	employees,
	leaveTypes: LEAVE_TYPE_FIXTURES,
	onCreate: (): void => {},
};

/** A reviewer whose turn it is, who does not read the approval's steps. */
const reviewer: LeaveReview = {
	canReview: true,
	readsApprovalSteps: false,
	busy: false,
	onApprove: (): void => {},
	onReject: (): void => {},
};

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
		review: reviewer,
		onClose: (): void => {},
	},
} satisfies Meta<typeof LeaveRequestDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {};
export const ReadOnly: Story = { args: { review: undefined } };
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
export const Apply: Story = { args: { mode: "apply", applyForm } };
export const ApplyRefused: Story = {
	args: {
		mode: "apply",
		applyForm: {
			...applyForm,
			refusal: {
				fields: { endDate: "They already have leave on one of these days." },
				refreshMembers: false,
			},
		},
	},
};

/** Under a flow, at HR (step 2 of 2), the reviewer's turn: the steps so far, then Approve and Reject. */
export const MidFlowReviewer: Story = {
	args: {
		request: atHr,
		review: { ...reviewer, readsApprovalSteps: true },
		lifecycle: reviewerLifecycle,
	},
};

/** Under a flow, at Manager (step 1 of 2): approving moves it on, so no roster check and no required comment. */
export const MidFlowApproveStepOne: Story = {
	args: { request: leaveAtStepFixture(1), mode: "approve" },
};

/** Under a flow, the last step: the roster check and the step it approves. */
export const MidFlowApproveLastStep: Story = {
	args: { request: atHr, mode: "approve", lifecycle: reviewerLifecycle },
};

/** The member's own request under a flow: only the step it waits on. */
export const MidFlowOwn: Story = {
	args: {
		request: leaveAtStepFixture(1),
		review: undefined,
		lifecycle: { companyId: "c-1", own: true, onDone: (): void => {} },
	},
};
