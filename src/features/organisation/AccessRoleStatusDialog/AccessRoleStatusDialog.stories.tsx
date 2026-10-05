import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AccessRoleStatusDialog } from "@/features/organisation/AccessRoleStatusDialog";

const role = {
	accessRoleId: "r-1",
	name: "Manager",
	protectedRole: false,
	status: "ACTIVE" as const,
	permissions: ["branch:read", "department:read", "department:update"],
	holderCount: 2,
};
const holders = [
	{ assignmentId: "a-1", membershipId: "m-1", displayName: "Priya Nair" },
	{
		assignmentId: "a-2",
		membershipId: "m-2",
		displayName: "Daniel Tan",
		branchName: "Orchard",
		departmentName: "Kitchen",
	},
	{
		assignmentId: "a-3",
		membershipId: "m-2",
		displayName: "Daniel Tan",
		branchName: "Tampines",
	},
];

const meta = {
	title: "Features/Organisation/AccessRoleStatusDialog",
	component: AccessRoleStatusDialog,
	args: {
		role,
		holders,
		affectsSelf: false,
		onConfirm: fn(),
		onClose: fn(),
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AccessRoleStatusDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Deactivate: Story = {};

/** The person deciding holds the role, so they are told they lose it too. */
export const DeactivateOwnRole: Story = { args: { affectsSelf: true } };

export const DeactivateUnassigned: Story = { args: { holders: [] } };

export const Activate: Story = {
	args: { role: { ...role, status: "INACTIVE" } },
};

export const Loading: Story = { args: { holders: undefined } };
