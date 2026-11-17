import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FunctionComponent } from "@/common/types";
import { ProfileDetails } from "@/features/people/ProfileDetails";
import "@/common/i18n";

const meta = {
	title: "Features/People/ProfileDetails",
	component: ProfileDetails,
	parameters: { layout: "padded" },
	args: {
		profile: {
			membershipId: "m-1",
			employeeCode: "EMP-10392",
			displayName: "Kent Chua",
			email: "kent.chua@company.com",
			phone: "+6583247931",
			branchId: "b-1",
			branchName: "Orchard",
			departmentId: "d-1",
			departmentName: "Food & Beverage",
			jobTitleId: "j-1",
			jobTitleName: "Pastry chef",
			status: "ACTIVE",
			dateOfBirth: "1987-03-22",
			employmentType: "FULL_TIME",
			hireDate: "2024-01-15",
			probationEndDate: null,
			endDate: null,
			reportsTo: { membershipId: "m-9", displayName: "Faris Ahmad" },
			invitationPending: false,
		},
		systemRoles: "User",
	},
	render: (args): NonNullable<FunctionComponent> => (
		<div className="max-w-270">
			<ProfileDetails {...args} />
		</div>
	),
} satisfies Meta<typeof ProfileDetails>;

export default meta;

type Story = StoryObj<typeof meta>;

/** As the design draws it: the probation end date is not set. */
export const Default: Story = {};

/** For someone who may not read system roles, the row is left out. */
export const WithoutSystemRole: Story = { args: { systemRoles: undefined } };

/** Nothing optional filled in. */
export const Sparse: Story = {
	args: {
		profile: {
			...meta.args.profile,
			phone: null,
			dateOfBirth: null,
			employmentType: null,
			hireDate: null,
			jobTitleId: null,
			jobTitleName: null,
			departmentId: null,
			departmentName: null,
			branchId: null,
			branchName: null,
			reportsTo: null,
		},
		systemRoles: "—",
	},
};

/** What their system roles give them at each place the reader can see. */
export const WithAccess: Story = {
	args: {
		access: [
			{
				place: "Whole company",
				roles: ["Viewer"],
				lines: ["Departments: View"],
			},
			{
				place: "Orchard",
				roles: ["Department manager"],
				lines: ["People: Manage", "Leave: Manage", "Scheduling: Full"],
			},
			{
				place: "Orchard › Food & Beverage",
				roles: ["Department manager"],
				lines: ["People: Manage", "Leave: Manage", "Scheduling: Full"],
			},
		],
	},
};

/** Their roles give nothing at the places the reader can see. */
export const WithoutAccess: Story = { args: { access: [] } };

/** Part-time by the terms, with a Contract label: "Part-time [From the terms] · Contract". */
export const PartTimeByTheTerms: Story = {
	args: {
		profile: {
			...meta.args.profile,
			partTime: true,
			employmentType: "CONTRACT",
		},
	},
};
