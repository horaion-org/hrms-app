import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	KITCHEN_REACH,
	managedLeaveDurationFixture,
} from "@/features/leaveDurations/fixtures";
import {
	LeaveDurationDialog,
	type LeaveDurationDialogProps,
} from "@/features/leaveDurations/LeaveDurationDialog";
import type { ManageableReach } from "@/features/leaveDurations/manageableReach";
import { storyProviders } from "@/features/organisation/storyApi";

/** Orchard with Kitchen, and Tampines with Front. */
const COMPANY_ADMIN: ManageableReach = {
	reaches: ["COMPANY", "BRANCHES", "DEPARTMENTS"],
	choices: {
		branches: [
			{
				branchId: "b-orchard",
				name: "Orchard",
				country: "SG",
				status: "ACTIVE",
			},
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
	},
};

/** Kitchen's admin: Chosen departments only, with Kitchen. */
const KITCHEN_ADMIN: ManageableReach = {
	reaches: ["DEPARTMENTS"],
	choices: {
		branches: [],
		departments: COMPANY_ADMIN.choices.departments.slice(0, 1),
	},
};

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/LeaveDurations/LeaveDurationDialog",
	component: LeaveDurationDialog,
	args: {
		reach: COMPANY_ADMIN,
		onClose: fn(),
		onSave: fn<LeaveDurationDialogProps["onSave"]>(() => Promise.resolve()),
	},
	decorators: [storyProviders(client)],
} satisfies Meta<typeof LeaveDurationDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A company admin's new duration starts for the whole company. */
export const CompanyAdminAdds: Story = {};

/** A Kitchen admin's new duration: Chosen departments only, Kitchen picked. */
export const DepartmentAdminAdds: Story = {
	args: { reach: KITCHEN_ADMIN },
};

/** Editing Kitchen's morning. */
export const Edit: Story = {
	args: {
		reach: KITCHEN_ADMIN,
		editing: managedLeaveDurationFixture({
			appliesToDepartments: [KITCHEN_REACH],
		}),
	},
};

/** A night duration: the end is before the start, so it ends the next day. */
export const NightDuration: Story = {
	args: {
		editing: managedLeaveDurationFixture({
			leaveDurationId: "ld-night",
			name: "Late night",
			startTime: "22:00",
			endTime: "02:00",
		}),
	},
};
