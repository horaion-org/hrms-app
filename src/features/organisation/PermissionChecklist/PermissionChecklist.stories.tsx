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

/** A creator who holds Notes' changes but not its View: they can't give any of them. */
export const PrerequisiteUnavailable: Story = {
	args: { value: [], unavailable: ["member_note:read"] },
};

/** A role holding a key newer than this app: shown ticked and locked. */
export const UnknownKeys: Story = {
	args: { unknown: ["leave:approve"] },
};
