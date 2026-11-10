import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
	AccessRoleEditor,
	AccessRoleEditorProblem,
} from "@/features/accessRoles/AccessRoleEditor";
import { ApiProblemError } from "@/common/problem";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const role = {
	accessRoleId: "r-manager",
	name: "Manager",
	protectedRole: false,
	kind: "LOCAL" as const,
	status: "ACTIVE" as const,
	permissions: ["branch:read", "department:read", "leave_request:review"],
	holderCount: 2,
};

const meta = {
	title: "Features/AccessRoles/AccessRoleEditor",
	component: AccessRoleEditor,
	parameters: { layout: "padded", permissions: [...PERMISSION_KEYS] },
	args: { role, tab: "people", onTabChange: fn() },
	decorators: [storyCompany(client, "story-company"), storyProviders(client)],
	beforeEach: (): (() => void) =>
		stubStoryApi(
			[
				{
					path: "/access-role-assignments",
					paged: false,
					content: [
						{
							accessRoleAssignmentId: "a-1",
							companyMembershipId: "m-1",
							displayName: "Priya Nair",
							status: "ACTIVE",
							branchId: null,
							branchName: null,
							departmentId: null,
							departmentName: null,
						},
						{
							accessRoleAssignmentId: "a-2",
							companyMembershipId: "m-2",
							displayName: "Daniel Tan",
							status: "ACTIVE",
							branchId: "b-1",
							branchName: "Orchard",
							departmentId: "d-1",
							departmentName: "Kitchen",
						},
					],
				},
			],
			true,
			client
		),
} satisfies Meta<typeof AccessRoleEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Who has the role and where, the default tab. */
export const People: Story = {};

/** The role's name and permissions, saved only with "Save changes". */
export const Permissions: Story = { args: { tab: "permissions" } };

/** The Company Owner role: every permission, and nothing to change. */
export const CompanyOwner: Story = {
	args: {
		tab: "permissions",
		role: {
			...role,
			accessRoleId: "r-owner",
			name: "Company Owner",
			protectedRole: true,
			kind: "COMPANY",
			permissions: [...PERMISSION_KEYS],
		},
	},
};

/** The role couldn't be loaded: no such role, here a 404. */
export const NotFound: StoryObj<typeof AccessRoleEditorProblem> = {
	render: () => (
		<AccessRoleEditorProblem
			error={
				new ApiProblemError({
					status: 404,
					errorCode: "ACCESS_ROLE_NOT_FOUND",
					fieldErrors: [],
					reason: "http",
					message: "Not found",
				})
			}
		/>
	),
};
