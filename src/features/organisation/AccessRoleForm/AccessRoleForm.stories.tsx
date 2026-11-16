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
			kind: "LOCAL",
			name: "Manager",
			permissions: ["branch:read", "branch:update", "department:read"],
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

/** A local role: company-only permissions aren't offered. */
export const Edit: Story = {};

/** A company role: every permission is offered, with no place hints. */
export const EditCompanyRole: Story = {
	args: {
		initial: {
			kind: "COMPANY",
			name: "Branch creator",
			permissions: ["branch:read", "branch:create", "audit_event:read"],
		},
	},
};

/** A new role, by someone who holds only some permissions: no type is chosen yet. */
export const Create: Story = {
	args: {
		mode: "create",
		initial: { kind: "", name: "", permissions: [] },
		unavailable: PERMISSION_KEYS.filter((key) => key.startsWith("access_role")),
	},
};

/** How the built-in System Owner and System Admin roles, and roles the person can't change, are shown. */
export const ReadOnly: Story = {
	args: {
		readOnly: true,
		initial: {
			kind: "COMPANY",
			name: "System Owner",
			permissions: [...PERMISSION_KEYS],
		},
	},
};

/** A site lead made before shift preferences, reports and people events existed. */
export const NewPermissions: Story = {
	args: {
		initial: {
			kind: "LOCAL",
			name: "Site lead",
			permissions: [
				"member_profile:read",
				"leave_request:read",
				"leave_request:review",
				"schedule:read",
				"schedule:create",
				"schedule:update",
				"schedule:generate",
				"schedule:delete",
				"schedule:publish",
				"schedule:edit_shift",
				"shift:read",
				"constraint:read",
				"approval:read",
				"approval:decide",
			],
		},
		newPermissions: [
			"shift_preference:read",
			"member_event:read",
			"report:read",
		],
	},
};
