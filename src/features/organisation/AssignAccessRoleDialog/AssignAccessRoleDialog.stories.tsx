import { useState, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { FunctionComponent } from "@/common/types";
import { authTestI18n } from "@/features/auth/testingI18n";
import { AssignAccessRoleDialog } from "@/features/organisation/AssignAccessRoleDialog";

const everyone = ["Marcus Lim", "Priya Nair", "Daniel Tan"].map(
	(displayName, index) => ({
		membershipId: `member-${index}`,
		displayName,
		status: "ACTIVE" as const,
	})
);

const meta = {
	title: "Features/Organisation/AssignAccessRoleDialog",
	component: AssignAccessRoleDialog,
	args: {
		roles: [
			{
				accessRoleId: "r-1",
				name: "Manager",
				protectedRole: false,
				permissions: ["branch:read", "department:read", "department:update"],
				holderCount: 2,
			},
			{
				accessRoleId: "r-2",
				name: "Supervisor",
				protectedRole: false,
				permissions: ["department:read", "department_member:read"],
				holderCount: 0,
			},
		],
		people: everyone,
		query: "",
		onQueryChange: fn(),
		targets: [
			{ label: "Whole company" },
			{ label: "Orchard", branchId: "b-1" },
			{ label: "Orchard › Kitchen", branchId: "b-1", departmentId: "d-1" },
			{
				label: "Orchard › Front of house",
				branchId: "b-1",
				departmentId: "d-2",
			},
			{ label: "Tampines", branchId: "b-2" },
		],
		onAssign: fn(),
		onClose: fn(),
	},
	decorators: [
		(Story): ReactElement => (
			<I18nextProvider i18n={authTestI18n}>
				<Story />
			</I18nextProvider>
		),
	],
	render: function Searchable(args): NonNullable<FunctionComponent> {
		const [query, setQuery] = useState(args.query);
		return (
			<AssignAccessRoleDialog
				{...args}
				query={query}
				people={everyone.filter((member) =>
					member.displayName.toLowerCase().includes(query.trim().toLowerCase())
				)}
				onQueryChange={setQuery}
			/>
		);
	},
} satisfies Meta<typeof AssignAccessRoleDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Opened from the System Roles list: the person chooses the role. */
export const Default: Story = { args: {} };
