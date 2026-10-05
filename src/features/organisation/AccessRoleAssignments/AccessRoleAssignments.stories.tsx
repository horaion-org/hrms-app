import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AccessRoleAssignments } from "@/features/organisation/AccessRoleAssignments";

const meta = {
	title: "Features/Organisation/AccessRoleAssignments",
	component: AccessRoleAssignments,
	parameters: { layout: "padded" },
	args: {
		assignments: [
			{
				assignmentId: "a-1",
				membershipId: "m-1",
				name: "Priya Nair",
				status: "ACTIVE" as const,
			},
			{
				assignmentId: "a-2",
				membershipId: "m-2",
				name: "Marcus Lim",
				status: "ACTIVE" as const,
				branchName: "Orchard",
			},
			{
				assignmentId: "a-3",
				membershipId: "m-3",
				name: "Daniel Tan",
				status: "ACTIVE" as const,
				branchName: "Orchard",
				departmentName: "Kitchen",
			},
			{
				assignmentId: "a-4",
				membershipId: "m-3",
				name: "Daniel Tan",
				status: "ACTIVE" as const,
				branchName: "Tampines",
				departmentName: "Front of house",
			},
		],
		onAssign: fn(),
		onEdit: fn(),
		onSetStatus: fn(),
		onRemove: fn(),
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AccessRoleAssignments>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { assignments: [] } };

/** For someone who may see who has the role but not change it. */
export const ViewOnly: Story = {
	args: {
		onAssign: undefined,
		onEdit: undefined,
		onSetStatus: undefined,
		onRemove: undefined,
	},
};
