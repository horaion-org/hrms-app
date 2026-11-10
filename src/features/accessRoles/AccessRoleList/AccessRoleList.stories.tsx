import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AccessRoleList } from "@/features/accessRoles/AccessRoleList";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const ROLES = [
	{
		accessRoleId: "r-owner",
		name: "Company Owner",
		protectedRole: true,
		kind: "COMPANY",
		status: "ACTIVE",
		permissions: [...PERMISSION_KEYS],
		holderCount: 1,
	},
	{
		accessRoleId: "r-manager",
		name: "Manager",
		protectedRole: false,
		kind: "LOCAL",
		status: "ACTIVE",
		permissions: ["branch:read", "department:read", "leave_request:review"],
		holderCount: 3,
	},
	{
		accessRoleId: "r-auditor",
		name: "Auditor",
		protectedRole: false,
		kind: "COMPANY",
		status: "INACTIVE",
		permissions: ["branch:read"],
		holderCount: 0,
	},
];

const meta = {
	title: "Features/AccessRoles/AccessRoleList",
	component: AccessRoleList,
	parameters: { layout: "padded", permissions: [...PERMISSION_KEYS] },
	decorators: [storyCompany(client, "story-company"), storyProviders(client)],
	beforeEach: (): (() => void) =>
		stubStoryApi([{ path: "/access-roles", content: ROLES }], false, client),
} satisfies Meta<typeof AccessRoleList>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Someone holding every key: create, assign, and each row's actions. */
export const Default: Story = {};

/** Someone who may only read roles: the list, with nothing to create or assign. */
export const ReadOnly: Story = {
	parameters: { permissions: ["access_role:read"] },
};
