import type { Meta, StoryObj } from "@storybook/react-vite";
import { waitingApprovalFixture } from "@/features/dashboard/fixtures";
import { WaitingApprovalsCard } from "@/features/dashboard/WaitingApprovalsCard";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/WaitingApprovalsCard",
	component: WaitingApprovalsCard,
	args: {
		className: "max-w-md",
		approvals: {
			status: "ready",
			data: [
				waitingApprovalFixture({ stalled: true }),
				waitingApprovalFixture({
					approvalInstanceId: "ai-2",
					subjectType: "SCHEDULE_PUBLICATION",
					departmentName: "Front desk",
				}),
			],
		},
	},
} satisfies Meta<typeof WaitingApprovalsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NothingWaiting: Story = {
	args: { approvals: { status: "ready", data: [] } },
};
