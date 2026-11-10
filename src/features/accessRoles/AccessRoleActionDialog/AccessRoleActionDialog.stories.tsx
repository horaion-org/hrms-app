import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AccessRoleActionDialog } from "@/features/accessRoles/AccessRoleActionDialog";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
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
	permissions: ["branch:read", "department:read"],
	holderCount: 0,
};

const meta = {
	title: "Features/AccessRoles/AccessRoleActionDialog",
	component: AccessRoleActionDialog,
	args: {
		action: { kind: "delete", role },
		heldPermissions: new Set(["branch:read", "department:read"]),
		onClose: fn(),
	},
	decorators: [storyCompany(client, "story-company"), storyProviders(client)],
	// Every change stays pending, so the dialogs show their submitting state.
	beforeEach: (): (() => void) => stubStoryApi([], true, client),
} satisfies Meta<typeof AccessRoleActionDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Deleting a role nobody holds, after asking. */
export const Delete: Story = {};

/** A copy starts from the role's kind, its name and the permissions the person may grant. */
export const Duplicate: Story = {
	args: {
		action: { kind: "duplicate", role },
		heldPermissions: new Set(["branch:read"]),
	},
};

/**
 * Deactivating names who loses access first. Nothing serves the holders in
 * Storybook, so the dialog says it couldn't check them.
 */
export const Deactivate: Story = {
	args: { action: { kind: "status", role: { ...role, holderCount: 2 } } },
};
