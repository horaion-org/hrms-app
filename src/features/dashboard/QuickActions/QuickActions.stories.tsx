import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	AddStaffIcon,
	ApproveRequestsIcon,
	FillShiftsIcon,
	GenerateScheduleIcon,
} from "@/components/ui/Icon";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { QuickActions } from "@/features/dashboard/QuickActions";

const meta = {
	title: "Features/Dashboard/QuickActions",
	component: QuickActions,
	decorators: [withMemoryRouter],
	args: {
		label: "Quick Actions",
		className: "max-w-96",
		actions: [
			{ label: "Generate Schedule", icon: GenerateScheduleIcon, to: "/" },
			{ label: "Add Staff", icon: AddStaffIcon, to: "/" },
			{ label: "Approve Requests", icon: ApproveRequestsIcon, to: "/" },
			{ label: "Fill Open Shifts", icon: FillShiftsIcon, to: "/" },
		],
	},
} satisfies Meta<typeof QuickActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
