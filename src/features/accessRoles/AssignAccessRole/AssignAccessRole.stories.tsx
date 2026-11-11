import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AssignAccessRole } from "@/features/accessRoles/AssignAccessRole";
import {
	STORY_PEOPLE,
	storyProviders,
	stubStoryApi,
} from "@/features/organisation/storyApi";
import { storyCompany } from "@/features/people/storyCompany";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});

const manager = {
	accessRoleId: "r-1",
	name: "Manager",
	protectedRole: false,
	kind: "LOCAL" as const,
	status: "ACTIVE" as const,
	permissions: ["branch:read", "department:read"],
	holderCount: 2,
};

const meta = {
	title: "Features/AccessRoles/AssignAccessRole",
	component: AssignAccessRole,
	parameters: { permissions: ["access_role:read", "access_role:assign"] },
	args: { roles: [manager], onClose: fn() },
	decorators: [storyCompany(client, "story-company"), storyProviders(client)],
	// Colleagues to choose from; assigning fails, so the dialog's alert shows.
	beforeEach: (): (() => void) =>
		stubStoryApi(
			[{ path: "/me/colleagues", content: STORY_PEOPLE }],
			false,
			client
		),
} satisfies Meta<typeof AssignAccessRole>;

export default meta;

type Story = StoryObj<typeof meta>;

/** One role to give: the person and the places are chosen. */
export const OneRole: Story = {};

/** Several roles: the person chooses the role too. */
export const SeveralRoles: Story = {
	args: {
		roles: [manager, { ...manager, accessRoleId: "r-2", name: "Supervisor" }],
	},
};
