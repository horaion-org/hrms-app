import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AccessRoleForm } from "@/features/organisation/AccessRoleForm";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const meta = {
	title: "Features/Organisation/AccessRoleForm",
	component: AccessRoleForm,
	parameters: { layout: "padded" },
	args: {
		mode: "edit",
		initial: {
			name: "Manager",
			permissions: ["branch:read", "branch:create", "department:read"],
		},
		onSubmit: fn(() => Promise.resolve()),
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
} satisfies Meta<typeof AccessRoleForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Edit: Story = {};

/** A new role, by someone who holds only some permissions. */
export const Create: Story = {
	args: {
		mode: "create",
		initial: { name: "", permissions: [] },
		unavailable: PERMISSION_KEYS.filter((key) => key.startsWith("access_role")),
	},
};

/** How the Company Owner role and roles the person can't change are shown. */
export const ReadOnly: Story = {
	args: {
		readOnly: true,
		initial: { name: "Company Owner", permissions: [...PERMISSION_KEYS] },
	},
};
