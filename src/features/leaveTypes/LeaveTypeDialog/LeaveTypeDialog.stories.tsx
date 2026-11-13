import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { managedLeaveTypeFixture } from "@/features/leaveTypes/fixtures";
import { LeaveTypeDialog } from "@/features/leaveTypes/LeaveTypeDialog";
import { storyProviders } from "@/features/organisation/storyApi";
import type { UnitReachChoices } from "@/features/workspace/unitReach";

const REACH_CHOICES: UnitReachChoices = {
	branches: [
		{ branchId: "b-orchard", name: "Orchard", country: "SG", status: "ACTIVE" },
		{
			branchId: "b-tampines",
			name: "Tampines",
			country: "SG",
			status: "ACTIVE",
		},
	],
	departments: [
		{
			departmentId: "d-kitchen",
			name: "Kitchen",
			branchId: "b-orchard",
			branchName: "Orchard",
			country: "SG",
			status: "ACTIVE",
		},
		{
			departmentId: "d-front",
			name: "Front",
			branchId: "b-tampines",
			branchName: "Tampines",
			country: "SG",
			status: "ACTIVE",
		},
	],
};

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/LeaveTypes/LeaveTypeDialog",
	component: LeaveTypeDialog,
	args: {
		reachChoices: REACH_CHOICES,
		onClose: fn(),
		onSave: fn(() => Promise.resolve()),
	},
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

/** A type for one Department: Applies to opens on Chosen departments with Kitchen picked. */
export const AppliesToChosenDepartments: Story = {
	args: {
		editing: {
			...managedLeaveTypeFixture({
				name: "Study leave",
				code: "STUDY_LEAVE",
				appliesToDepartments: [
					{
						departmentId: "d-kitchen",
						departmentName: "Kitchen",
						branchId: "b-orchard",
						branchName: "Orchard",
					},
				],
			}),
			grantKind: "ALLOWANCE",
		},
	},
};
