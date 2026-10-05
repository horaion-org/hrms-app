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
			{ assignmentId: "a-1", membershipId: "m-1", displayName: "Priya Nair" },
			{
				assignmentId: "a-2",
				membershipId: "m-2",
				displayName: "Marcus Lim",
				branchName: "Orchard",
			},
			{
				assignmentId: "a-3",
				membershipId: "m-3",
				displayName: "Daniel Tan",
				branchName: "Orchard",
				departmentName: "Kitchen",
			},
			{
				assignmentId: "a-4",
				membershipId: "m-3",
				displayName: "Daniel Tan",
				branchName: "Tampines",
				departmentName: "Front of house",
			},
		],
		onAssign: fn(),
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

/** For someone who may see who holds the role but not change it. */
export const ViewOnly: Story = {
	args: { onAssign: undefined, onRemove: undefined },
};
