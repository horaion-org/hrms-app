import { QueryClient } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { CreateSystemRoleDialog } from "@/features/organisation/CreateSystemRoleDialog";
import { storyProviders, stubStoryApi } from "@/features/organisation/storyApi";
import { PERMISSION_KEYS } from "@/features/workspace/permissionKeys";

const client = new QueryClient({
	defaultOptions: { queries: { retry: false } },
});
const meta = {
	title: "Features/Organisation/CreateSystemRoleDialog",
	component: CreateSystemRoleDialog,
	args: {
		companyId: "story-company",
		heldPermissions: new Set(PERMISSION_KEYS),
		onClose: fn(),
	},
	decorators: [storyProviders(client)],
	beforeEach: ({ parameters }): (() => void) =>
		stubStoryApi([], Boolean(parameters["pending"]), client),
} satisfies Meta<typeof CreateSystemRoleDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

const fill = async (body: HTMLElement): Promise<void> => {
	const page = within(body);
	await userEvent.type(
		await page.findByLabelText("Role name"),
		"Branch manager"
	);
	// Edit needs View, so both are chosen.
	await userEvent.click(
		within(page.getByRole("group", { name: "Branches" })).getByRole(
			"checkbox",
			{ name: "Edit" }
		)
	);
};
const submit = async (body: HTMLElement): Promise<void> => {
	await userEvent.click(
		within(body).getByRole("button", { name: "Create system role" })
	);
};

/** The Company Owner holds every permission, so every box can be chosen. */
export const Owner: Story = {};
/** Someone with a narrower role can only grant what they hold. */
export const LimitedCreator: Story = {
	args: {
		heldPermissions: new Set([
			"branch:read",
			"department:read",
			"access_role:read",
			"access_role:create",
		]),
	},
};
export const Chosen: Story = {
	play: async ({ canvasElement }) => {
		await fill(canvasElement.ownerDocument.body);
	},
};
export const NoPermissionChosen: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await userEvent.type(
			await within(body).findByLabelText("Role name"),
			"Auditor"
		);
		await submit(body);
	},
};
export const Submitting: Story = {
	parameters: { pending: true },
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await fill(body);
		await submit(body);
	},
};
export const FormError: Story = { play: Submitting.play };
