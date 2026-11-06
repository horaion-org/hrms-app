import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactElement } from "react";
import { fn } from "storybook/test";
import { RosterCellPanel } from "@/features/scheduling/RosterCellPanel";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import "@/common/i18n";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const roster = scheduleAssignmentsFixture();

const meta = {
	title: "Features/Scheduling/RosterCellPanel",
	component: RosterCellPanel,
	decorators: [
		(Story): ReactElement => (
			<QueryClientProvider client={client}>
				<Story />
			</QueryClientProvider>
		),
	],
	args: {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 1,
		assignment: roster[0]!,
		assignments: roster,
		shifts: frozenShiftsFixture(),
		onClose: fn(),
		onPreviewDays: fn(),
		onApplied: fn(),
	},
} satisfies Meta<typeof RosterCellPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A working day, before anything is chosen. */
export const WorkingDay: Story = {};

/** A day off: give a shift, or swap with someone working. */
export const DayOff: Story = {
	args: {
		assignment: roster.find(
			(row) => row.member?.membershipId === "m-1" && row.day === "2026-10-17"
		)!,
	},
};

/** Someone who may change leave: another type, a shift or a day off, each with a required remark. */
export const LeaveWithLeaveChoices: Story = {
	args: {
		assignment: roster.find((row) => row.offReason === "LEAVE")!,
		leaveEditing: { viewerMembershipId: "manager-1" },
	},
};

/** Cancelled leave left this day: give a shift or confirm the day off. */
export const DayToDecide: Story = {
	args: {
		assignment: {
			...roster.find((row) => row.offReason === "LEAVE")!,
			offReason: "OFF",
			flag: "NEEDS_DECISION",
		},
	},
};

/** Leave is changed in Leave, never here. */
export const Leave: Story = {
	args: {
		assignment: roster.find((row) => row.offReason === "LEAVE")!,
	},
};
