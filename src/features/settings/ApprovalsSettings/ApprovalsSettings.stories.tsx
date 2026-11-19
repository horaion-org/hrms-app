import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import {
	approvalFlowsQuery,
	type ApprovalFlow,
} from "@/features/approvals/api";
import {
	approvalFlowFixture,
	companyFlowFixture,
	leaveFlowFixture,
} from "@/features/approvals/fixtures";
import { storyProviders } from "@/features/organisation/storyApi";
import { ApprovalsSettings } from "@/features/settings/ApprovalsSettings";
import { workspaceQuery } from "@/features/workspace/api";

const COMPANY = "story-company";
const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Settings/ApprovalsSettings",
	component: ApprovalsSettings,
	parameters: { layout: "padded" },
	args: {
		companyId: COMPANY,
		canRead: true,
		canManage: true,
		subject: "SCHEDULE_PUBLICATION",
	},
	decorators: [storyProviders(client)],
	beforeEach: ({ parameters }): void => {
		client.setQueryData(
			workspaceQuery.queryKey,
			effectiveWorkspace({
				companies: [
					{
						uuid: COMPANY,
						name: "Story company",
						permissions: ["approval_flow:read", "approval_flow:manage"],
						branches: [
							{
								uuid: "b-1",
								name: "Main branch",
								status: "ACTIVE",
								country: "SG",
								permissions: [],
								departments: [
									{
										uuid: "d-1",
										name: "Front Office",
										status: "ACTIVE",
										permissions: [],
									},
								],
							},
						],
					},
				],
			})
		);
		client.setQueryData(
			approvalFlowsQuery(COMPANY).queryKey,
			(parameters["flows"] as Array<ApprovalFlow> | undefined) ?? [
				companyFlowFixture(),
				approvalFlowFixture(),
			]
		);
	},
} satisfies Meta<typeof ApprovalsSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Roster approvals: the company default and Front Office's two-step flow. Editable. */
export const Editable: Story = {};

/** Leave approvals: leave by Manager then HR for the whole company; the roster flows are not shown. */
export const LeaveApprovals: Story = {
	args: { subject: "LEAVE_REQUEST" },
	parameters: {
		flows: [companyFlowFixture(), approvalFlowFixture(), leaveFlowFixture()],
	},
};

/** Only a department's roster flow: the line under it says the rest publish in one step. */
export const DepartmentOnly: Story = {
	parameters: { flows: [approvalFlowFixture()] },
};

/** Read-only: approval_flow:read without :manage. */
export const ReadOnly: Story = {
	args: { canManage: false },
};

/** No flow: rosters publish in one step. */
export const Empty: Story = {
	parameters: { flows: [] },
};
