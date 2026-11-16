import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { dayOffFixture } from "@/features/dashboard/fixtures";
import { OffTodayCard } from "@/features/dashboard/OffTodayCard";
import { leaveFixture } from "@/features/leave/fixtures";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/OffTodayCard",
	component: OffTodayCard,
	decorators: [withMemoryRouter],
	args: {
		className: "max-w-md",
		days: ["2026-11-16", "2026-11-17"],
		leave: {
			status: "ready",
			data: [
				leaveFixture({
					leaveRequestId: "leave-aisha",
					status: "APPROVED",
					startDate: "2026-11-16",
					endDate: "2026-11-17",
				}),
			],
		},
		daysOff: { status: "ready", data: [dayOffFixture()] },
	},
} satisfies Meta<typeof OffTodayCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NobodyOff: Story = {
	args: {
		leave: { status: "ready", data: [] },
		daysOff: { status: "ready", data: [] },
	},
};
