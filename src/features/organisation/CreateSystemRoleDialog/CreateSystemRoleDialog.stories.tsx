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

const chooseType = async (
	body: HTMLElement,
	type: "Company role" | "Local role"
): Promise<void> => {
	const page = within(body);
	await userEvent.click(await page.findByRole("button", { name: "Role type" }));
	await userEvent.click(await page.findByRole("option", { name: type }));
};
const fill = async (body: HTMLElement): Promise<void> => {
	const page = within(body);
	await chooseType(body, "Local role");
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

/** Nothing can be ticked until the role's type is chosen. */
export const Owner: Story = {};
/** A company role: the Company Owner holds every permission, so every box can be chosen. */
export const CompanyRole: Story = {
	play: async ({ canvasElement }) => {
		await chooseType(canvasElement.ownerDocument.body, "Company role");
	},
};
/** A local role: company-only permissions aren't offered. */
export const LocalRole: Story = {
	play: async ({ canvasElement }) => {
		await chooseType(canvasElement.ownerDocument.body, "Local role");
	},
};
/** A company role switched to local: its company-only permissions are cleared and named. */
export const SwitchedToLocal: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await chooseType(body, "Company role");
		await userEvent.click(
			within(within(body).getByRole("group", { name: "Branches" })).getByRole(
				"checkbox",
				{ name: "Create" }
			)
		);
		await chooseType(body, "Local role");
	},
};
/** A duplicate starts from the copied role's type, name and permissions. */
export const Duplicate: Story = {
	args: {
		initial: {
			kind: "LOCAL",
			name: "Manager copy",
			permissions: ["branch:read", "department:read"],
		},
	},
};
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
	play: CompanyRole.play,
};
export const Chosen: Story = {
	play: async ({ canvasElement }) => {
		await fill(canvasElement.ownerDocument.body);
	},
};
export const NoPermissionChosen: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await chooseType(body, "Local role");
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
/** Submitted without a type or permissions: both are asked for. */
export const NothingChosen: Story = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.ownerDocument.body;
		await userEvent.type(
			await within(body).findByLabelText("Role name"),
			"Auditor"
		);
		await submit(body);
	},
};
