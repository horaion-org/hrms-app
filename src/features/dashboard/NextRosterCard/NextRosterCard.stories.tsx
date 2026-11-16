import type { Meta, StoryObj } from "@storybook/react-vite";
import { withMemoryRouter } from "@/components/utils/MemoryRouterHarness";
import { NextRosterCard } from "@/features/dashboard/NextRosterCard";
import "@/common/i18n";

const meta = {
	title: "Features/Dashboard/NextRosterCard",
	component: NextRosterCard,
	decorators: [withMemoryRouter],
	args: {
		className: "max-w-md",
		comingMonday: "2026-11-23",
		rows: {
			status: "ready",
			data: [
				{
					branchId: "b-1",
					departmentId: "d-1",
					departmentName: "Bar",
					state: "TO_REVIEW",
					scheduleId: "s-1",
					step: "review",
					missing: [],
				},
				{
					branchId: "b-1",
					departmentId: "d-2",
					departmentName: "Kitchen",
					state: "NOT_GENERATED",
					scheduleId: null,
					step: "setUp",
					missing: ["STAFFING_CONSTRAINT"],
				},
				{
					branchId: "b-1",
					departmentId: "d-3",
					departmentName: "Sales",
					state: "PUBLISHED",
					scheduleId: "s-3",
					step: "done",
					missing: [],
				},
			],
		},
	},
} satisfies Meta<typeof NextRosterCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoDepartments: Story = {
	args: { rows: { status: "ready", data: [] } },
};
