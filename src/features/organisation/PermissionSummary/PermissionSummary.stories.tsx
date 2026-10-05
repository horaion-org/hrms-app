import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const meta = {
	title: "Features/Organisation/PermissionSummary",
	component: PermissionSummary,
	parameters: { layout: "padded" },
	args: {
		title: "This role allows",
		permissions: [
			"branch:read",
			"branch_member:read",
			"branch_member:create",
			"department:read",
			"department:update",
		],
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof PermissionSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Everything: Story = {
	args: { permissions: [...PERMISSION_KEYS] },
};

export const Nothing: Story = { args: { permissions: [] } };
