import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { PermissionsGrid } from "@/features/organisation/PermissionsGrid";
import { PERMISSION_KEYS } from "@/features/organisation/permissionCatalogue";

const meta = {
	title: "Features/Organisation/PermissionsGrid",
	component: PermissionsGrid,
	parameters: { layout: "padded" },
	args: {
		legend: "Permissions",
		value: ["branch:read", "branch:update"],
		onChange: fn(),
		grantable: new Set(PERMISSION_KEYS),
		hint: "Choose at least 1 permission.",
		counter: "2 selected",
		required: true,
	},
	decorators: [
		(Story): NonNullable<FunctionComponent> => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	render: function Controlled(args): NonNullable<FunctionComponent> {
		const [value, setValue] = useState(args.value);
		return (
			<PermissionsGrid
				{...args}
				counter={`${value.length} selected`}
				value={value}
				onChange={(next) => {
					setValue(next);
					args.onChange(next);
				}}
			/>
		);
	},
} satisfies Meta<typeof PermissionsGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** Boxes the creator does not hold company-wide are disabled. */
export const LimitedGrants: Story = {
	args: {
		value: [],
		grantable: new Set(["branch:read", "department:read", "audit_event:read"]),
		hint: "Choose at least 1 permission. You can only grant permissions you hold.",
	},
};
export const WithError: Story = {
	args: { value: [], error: "Choose at least one permission." },
};
export const Disabled: Story = { args: { disabled: true } };
