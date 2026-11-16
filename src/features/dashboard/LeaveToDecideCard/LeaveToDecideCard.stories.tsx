import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { LeaveToDecideCard } from "@/features/dashboard/LeaveToDecideCard";
import { leaveFixture } from "@/features/leave/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/LeaveToDecideCard",
	component: LeaveToDecideCard,
	decorators: [withMemoryRouter],
	args: {
		className: "max-w-md",
		pending: {
			status: "ready",
			items: [leaveFixture({ leaveRequestId: "leave-aisha" })],
			total: 1,
		},
		canDecide: (): boolean => true,
		busy: false,
		onOpen: (): void => {},
	},
} satisfies Meta<typeof LeaveToDecideCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Failed: Story = { args: { pending: { status: "error" } } };
