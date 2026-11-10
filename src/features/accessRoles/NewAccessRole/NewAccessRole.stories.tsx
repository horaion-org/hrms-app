import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NewAccessRole } from "@/features/accessRoles/NewAccessRole";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const meta = {
	title: "Features/AccessRoles/NewAccessRole",
	component: NewAccessRole,
	parameters: { layout: "padded", permissions: [...PERMISSION_KEYS] },
	decorators: [storyCompany(client, "story-company"), storyProviders(client)],
	// Creating stays pending, so the form shows its submitting state.
	beforeEach: (): (() => void) => stubStoryApi([], true, client),
} satisfies Meta<typeof NewAccessRole>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Someone holding every key may give the new role any of them. */
export const Default: Story = {};

/** Permissions the person doesn't hold company-wide are shown but can't be ticked. */
export const SomeUnavailable: Story = {
	parameters: {
		permissions: ["access_role:create", "branch:read", "department:read"],
	},
};

/** Without `access_role:create` the page says so instead of offering the form. */
export const Forbidden: Story = {
	parameters: { permissions: ["access_role:read"] },
};
