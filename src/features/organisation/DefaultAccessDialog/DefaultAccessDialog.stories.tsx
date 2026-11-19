import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { DefaultAccessDialog } from "@/features/organisation/DefaultAccessDialog";

const meta = {
	title: "Features/Organisation/DefaultAccessDialog",
	component: DefaultAccessDialog,
	args: {
		roles: [
			{
				accessRoleId: "r-1",
				name: "Staff",
				protectedRole: false,
				kind: "LOCAL",
				status: "ACTIVE",
				permissions: ["schedule:read", "department:read"],
				holderCount: 0,
			},
			{
				accessRoleId: "r-2",
				name: "Branch roster",
				protectedRole: false,
				kind: "LOCAL",
				status: "ACTIVE",
				permissions: ["branch:read", "schedule:read"],
				holderCount: 0,
			},
		],
		places: [
			{ label: "Whole company" },
			{ label: "Harbour Hotel", branchId: "b-1" },
			{
				label: "Harbour Hotel › Housekeeping",
				branchId: "b-1",
				departmentId: "d-1",
			},
		],
		onAdd: fn(),
		onClose: fn(),
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof DefaultAccessDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Opened from Settings › Access roles: the whole company is chosen until another place is. */
export const Default: Story = {};

/** No role can be default access: each is a company role, built in or switched off. */
export const NoRoleFits: Story = { args: { roles: [] } };

/** The API refused the last attempt; the reason says what to do. */
export const Refused: Story = {
	args: {
		error:
			"That role is already default access there. Remove it first to change where it applies.",
	},
};

/** While the default is being added, nothing can be changed or closed. */
export const Submitting: Story = { args: { submitting: true } };
