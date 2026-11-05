import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { managedLeaveTypeFixture } from "@/features/leaveTypes/fixtures";
import { LeaveTypeDialog } from "@/features/leaveTypes/LeaveTypeDialog";
import { storyProviders } from "@/features/organisation/storyApi";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/LeaveTypes/LeaveTypeDialog",
	component: LeaveTypeDialog,
	args: { onClose: fn(), onSave: fn(() => Promise.resolve()) },
	decorators: [storyProviders(client)],
} satisfies Meta<typeof LeaveTypeDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A new type starts as a paid yearly allowance with no reason asked. */
export const Add: Story = {};

/** No request uses it yet: every field may change. */
export const EditUnused: Story = {
	args: {
		editing: {
			...managedLeaveTypeFixture({ name: "Study leave", code: "STUDY_LEAVE" }),
			grantKind: "ALLOWANCE",
		},
	},
};

/** Requests use it, so how it is counted is fixed. */
export const EditUsed: Story = {
	args: {
		editing: {
			...managedLeaveTypeFixture({ requestCount: 12 }),
			grantKind: "ALLOWANCE",
		},
	},
};
