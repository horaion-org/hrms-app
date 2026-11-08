import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ApprovalFlowDialog } from "@/features/approvals/ApprovalFlowDialog";
import { approvalFlowFixture } from "@/features/approvals/fixtures";
import { effectiveWorkspace } from "@/common/testing/effectiveWorkspace";
import { storyProviders } from "@/features/organisation/storyApi";
import { workspaceQuery } from "@/features/workspace/api";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false, staleTime: Infinity } },
});

const meta = {
	title: "Features/Approvals/ApprovalFlowDialog",
	component: ApprovalFlowDialog,
	args: {
		companyId: "story-company",
		departmentName: (departmentId: string): string | undefined =>
			departmentId === "d-1" ? "Front Office" : undefined,
		onClose: fn(),
		onSave: fn(() => Promise.resolve()),
	},
	decorators: [storyProviders(client)],
	beforeEach: (): void => {
		client.setQueryData(
			workspaceQuery.queryKey,
			effectiveWorkspace({
				companies: [
					{
						uuid: "story-company",
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
	},
} satisfies Meta<typeof ApprovalFlowDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A new flow: one step, decided by anyone who can publish. */
export const Add: Story = {};

/** Front Office's flow: Endorse by two named people, all of them, then Publish. */
export const Edit: Story = {
	args: { editing: approvalFlowFixture() },
};
