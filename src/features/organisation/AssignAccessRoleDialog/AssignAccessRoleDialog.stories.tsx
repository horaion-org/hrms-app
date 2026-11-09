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
				kind: "LOCAL",
				status: "ACTIVE",
				permissions: ["branch:read", "department:read", "department:update"],
				holderCount: 2,
			},
			{
				accessRoleId: "r-2",
				name: "Supervisor",
				protectedRole: false,
				kind: "LOCAL",
				status: "ACTIVE",
				permissions: ["department:read", "department_member:read"],
				holderCount: 0,
			},
			{
				accessRoleId: "r-3",
				name: "Branch creator",
				protectedRole: false,
				kind: "COMPANY",
				status: "ACTIVE",
				permissions: ["branch:read", "branch:create"],
				holderCount: 1,
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

const LABELS: Record<string, string> = {
	"": "Whole company",
	"b-1": "Orchard",
	"d-1": "Orchard › Kitchen",
	"d-2": "Orchard › Front of house",
	"b-2": "Tampines",
};

/**
 * With what the chosen person holds now, the dialog previews their access
 * after the change: Marcus already approves leave at Tampines.
 */
export const AccessPreview: Story = {
	args: {
		preview: {
			assignments: [
				{
					accessRoleAssignmentId: "a-1",
					accessRoleId: "r-9",
					status: "ACTIVE",
					branchId: "b-2",
					departmentId: null,
				},
			],
			roles: [
				{
					accessRoleId: "r-9",
					name: "Leave approver",
					protectedRole: false,
					kind: "LOCAL",
					status: "ACTIVE",
					permissions: ["leave_request:read", "leave_request:review"],
					holderCount: 1,
				},
			],
			placeLabel: (place) => LABELS[place.departmentId ?? place.branchId ?? ""],
		},
		roles: [
			{
				accessRoleId: "r-1",
				name: "Manager",
				protectedRole: false,
				kind: "LOCAL",
				status: "ACTIVE",
				permissions: ["branch:read", "department:read", "department:update"],
				holderCount: 2,
			},
		],
		editing: {
			person: everyone[0]!,
			places: [{ label: "Orchard", branchId: "b-1" }],
		},
	},
};

/** A company role whose only place, the whole company, the person may not assign at. */
export const CompanyRoleOutOfReach: Story = {
	args: {
		roles: [
			{
				accessRoleId: "r-3",
				name: "Branch creator",
				protectedRole: false,
				kind: "COMPANY",
				status: "ACTIVE",
				permissions: ["branch:read", "branch:create"],
				holderCount: 1,
			},
		],
		targets: [
			{ label: "Orchard", branchId: "b-1" },
			{ label: "Tampines", branchId: "b-2" },
		],
	},
};
