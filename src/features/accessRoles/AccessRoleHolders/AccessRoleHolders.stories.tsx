import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccessRoleHolders } from "@/features/accessRoles/AccessRoleHolders";
import { storyProviders } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const role = {
	accessRoleId: "r-1",
	name: "Manager",
	protectedRole: false,
	kind: "LOCAL" as const,
	status: "ACTIVE" as const,
	permissions: ["branch:read", "department:read", "department:update"],
	holderCount: 2,
};

const meta = {
	title: "Features/AccessRoles/AccessRoleHolders",
	component: AccessRoleHolders,
	parameters: {
		layout: "padded",
		permissions: ["access_role:read", "access_role:assign"],
	},
	args: {
		role,
		holders: [
			{
				assignmentId: "a-1",
				membershipId: "m-1",
				name: "Priya Nair",
				status: "ACTIVE",
			},
			{
				assignmentId: "a-2",
				membershipId: "m-2",
				name: "Daniel Tan",
				status: "ACTIVE",
				branchId: "b-1",
				branchName: "Orchard",
				departmentId: "d-1",
				departmentName: "Kitchen",
			},
		],
	},
	decorators: [storyCompany(client, "story-company"), storyProviders(client)],
} satisfies Meta<typeof AccessRoleHolders>;

export default meta;

type Story = StoryObj<typeof meta>;

/** What the role allows, then who has it and where, with assigning and changing. */
export const Default: Story = {};

/** An inactive role: said so, and not newly assigned. */
export const Inactive: Story = {
	args: { role: { ...role, status: "INACTIVE" } },
};

/** Someone who may only read roles: the people, with nothing to change. */
export const ReadOnly: Story = {
	parameters: { permissions: ["access_role:read"] },
};

/** Who holds the role couldn't be loaded. */
export const LoadFailed: Story = {
	args: { holders: undefined },
};
