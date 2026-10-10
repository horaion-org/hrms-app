import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PermissionChecklist } from "@/features/organisation/PermissionChecklist";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const meta = {
	title: "Features/Organisation/PermissionChecklist",
	component: PermissionChecklist,
	parameters: { layout: "padded" },
	args: {
		label: "Permissions",
		value: ["branch:read", "branch:create", "department:read"],
		onChange: fn(),
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	render: function Controlled(args): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		return <PermissionChecklist {...args} value={value} onChange={setValue} />;
	},
} satisfies Meta<typeof PermissionChecklist>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NothingSelected: Story = { args: { value: [] } };

/** How the Company Owner role and roles the person can't change are shown. */
export const ReadOnly: Story = {
	args: { value: [...PERMISSION_KEYS], disabled: true },
};

/** Creating people needs their job title picker, so Job titles: View says why it is ticked. */
export const ImpliedPermission: Story = {
	args: {
		value: [
			"job_title:read",
			"member_profile:read",
			"member_profile:create",
			"member_profile:update",
		],
	},
};

/** An implied permission cleared by hand stays clear, with a warning of what still needs it. */
export const ImpliedPermissionCleared: Story = {
	args: { value: ["member_profile:read", "member_profile:create"] },
};

/** A tick never adds an implied permission the person may not grant. */
export const ImpliedPermissionUnavailable: Story = {
	args: { value: [], unavailable: ["job_title:read"] },
};
